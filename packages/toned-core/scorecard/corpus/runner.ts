/**
 * Measures, for every case in a corpus directory, the earliest stage at which
 * toned reports the mistake, and whether that report names the fix.
 *
 * - compile: any TypeScript diagnostic in the case file, from one `tsc` run
 *   with toned-core's own compiler options;
 * - build: `buildStyles` throws or warns for the case's sheets, or the case's
 *   own `build` step (an output build) does;
 * - runtime: importing the case, constructing its sheets, resolving them
 *   through the web renderer or running its `exercise` throws or warns;
 * - silent: none of the above.
 *
 * Nothing here is hand-written: a case only records its baseline, and the
 * runner says whether today's result regressed from it.
 */
import { readdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { pathToFileURL } from 'node:url'

import { buildStyles } from '../../build/index.ts'
import { createWebRenderer } from '../../server/index.ts'
import type { StylesheetInstance } from '../../types/index.ts'
import { resetWarnings } from '../../utils/warn.ts'
import { __resetWarnings } from '../../utils/warnOnce.ts'
import { ui as fixtureSystem } from '../fixture/system.ts'
import { capture, compileDiagnostics, coreRoot } from '../probe.ts'
import { type CorpusCase, STAGES, type Stage } from './case.ts'

export type Report = { stage: Exclude<Stage, 'silent'>; message: string }

export type CaseResult = {
  id: string
  file: string
  description: string
  category: CorpusCase['category']
  stage: Stage
  namesFix: boolean
  /** The first report at `stage`, if any. */
  message?: string
  /** Every report, in stage order. */
  reports: Report[]
  baseline: CorpusCase['baseline']
  /** Caught later than recorded, or no longer naming the fix at the same stage. */
  regressed: boolean
  /** Caught earlier than recorded, or newly naming the fix: update the baseline. */
  improved: boolean
}

async function runtimeReports(
  file: string,
): Promise<{ meta?: CorpusCase; reports: Report[] }> {
  resetWarnings()
  __resetWarnings()
  const reports: Report[] = []
  const add = (stage: Report['stage'], messages: string[]) =>
    reports.push(...messages.map((message) => ({ stage, message })))

  let meta: CorpusCase | undefined
  add(
    'runtime',
    await capture(async () => {
      meta = (await import(pathToFileURL(file).href)).default as CorpusCase
    }),
  )
  if (!meta) return { reports }
  const system = meta.system ?? fixtureSystem
  let sheets: readonly unknown[] = []
  add('runtime', await capture(() => (sheets = meta?.sheets?.() ?? [])))
  const typed = sheets as readonly StylesheetInstance[]
  let manifest: ReturnType<typeof buildStyles>['manifest'] | undefined
  add(
    'build',
    await capture(
      () => (manifest = buildStyles(system, { sheets: typed }).manifest),
    ),
  )
  if (meta.build) add('build', await capture(() => meta?.build?.()))
  if (manifest) {
    const web = createWebRenderer(system, { manifest })
    add(
      'runtime',
      await capture(() => typed.forEach((sheet) => web.resolve(sheet))),
    )
  }
  if (meta.exercise) add('runtime', await capture(() => meta?.exercise?.()))
  return { meta, reports }
}

const rank = (stage: Stage) => STAGES.indexOf(stage)

const matches = (fix: CorpusCase['fix'], message: string) =>
  typeof fix === 'string' ? message.includes(fix) : fix.test(message)

/** Measures every `*.ts` case file in `dir`. */
export async function runCorpus(dir: string): Promise<CaseResult[]> {
  const files = readdirSync(dir)
    .filter((name) => name.endsWith('.ts'))
    .sort()
    .map((name) => join(dir, name))
  const diagnostics = compileDiagnostics(files)
  const results: CaseResult[] = []
  for (const file of files) {
    const { meta, reports: later } = await runtimeReports(file)
    if (!meta)
      throw new Error(
        `${file} has no default-exported case: ${later[0]?.message}`,
      )
    const reports: Report[] = [
      ...(diagnostics.get(file) ?? []).map((message) => ({
        stage: 'compile' as const,
        message,
      })),
      ...later,
    ].sort((a, b) => rank(a.stage) - rank(b.stage))
    const first = reports[0]
    const stage: Stage = first?.stage ?? 'silent'
    const atStage = reports.filter((report) => report.stage === stage)
    const namesFix = atStage.some((report) => matches(meta.fix, report.message))
    const { baseline } = meta
    results.push({
      id: meta.id,
      file: file.slice(dirname(coreRoot).length + 1),
      description: meta.description,
      category: meta.category,
      stage,
      namesFix,
      ...(first ? { message: first.message } : {}),
      reports,
      baseline,
      regressed:
        rank(stage) > rank(baseline.stage) ||
        (stage === baseline.stage && baseline.namesFix && !namesFix),
      improved:
        rank(stage) < rank(baseline.stage) ||
        (stage === baseline.stage && !baseline.namesFix && namesFix),
    })
  }
  return results
}
