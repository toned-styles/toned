/**
 * Measures, for every case in a corpus directory, the earliest stage at which
 * toned reports the mistake, and whether that report names the fix.
 *
 * - compile: any TypeScript diagnostic in the case file, from one `tsc` run
 *   with toned-core's own compiler options;
 * - build: `buildStyles` throws or warns for the case's sheets;
 * - runtime: importing the case, constructing its sheets, resolving them
 *   through the web renderer or running its `exercise` throws or warns;
 * - silent: none of the above.
 *
 * Nothing here is hand-written: a case only records its baseline, and the
 * runner says whether today's result regressed from it.
 */
import { spawnSync } from 'node:child_process'
import { readdirSync, rmSync, writeFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

import { buildStyles } from '../../build/index.ts'
import { createWebRenderer } from '../../server/index.ts'
import type { StylesheetInstance } from '../../types/index.ts'
import { resetWarnings } from '../../utils/warn.ts'
import { __resetWarnings } from '../../utils/warnOnce.ts'
import { ui as fixtureSystem } from '../fixture/system.ts'
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

const coreRoot = fileURLToPath(new URL('../../', import.meta.url))

/** The `tsc` CI runs (TypeScript 7 is a native binary with no JS API). */
function tscBinary(): string {
  const manifest = createRequire(import.meta.url).resolve(
    'typescript/package.json',
  )
  return join(dirname(manifest), 'bin', 'tsc')
}

/**
 * Every TypeScript diagnostic per case file, from one `tsc` run with
 * toned-core's own compiler options. The temporary project sits in the
 * package root so `${configDir}` paths resolve exactly as in the real build.
 */
export function compileDiagnostics(
  files: readonly string[],
): Map<string, string[]> {
  const project = join(coreRoot, `.tsconfig.scorecard-${process.pid}.json`)
  writeFileSync(
    project,
    JSON.stringify({
      extends: './tsconfig.json',
      compilerOptions: { noEmit: true, composite: false, incremental: false },
      include: [],
      files,
    }),
  )
  let output: string
  try {
    const run = spawnSync(
      process.execPath,
      [tscBinary(), '-p', project, '--pretty', 'false'],
      {
        cwd: coreRoot,
        encoding: 'utf8',
      },
    )
    if (run.error) throw run.error
    output = `${run.stdout}${run.stderr}`
  } finally {
    rmSync(project, { force: true })
  }
  const byFile = new Map<string, string[]>(files.map((file) => [file, []]))
  let current: string[] | undefined
  for (const line of output.split('\n')) {
    const head = /^(.+?)\(\d+,\d+\): error (TS\d+): (.*)$/.exec(line)
    if (head) {
      current = byFile.get(resolve(coreRoot, head[1] ?? ''))
      current?.push(`${head[2]}: ${head[3]}`)
    } else if (current && /^\s/.test(line)) {
      current[current.length - 1] += `\n${line.trim()}`
    } else if (line.trim()) {
      current = undefined
    }
  }
  return byFile
}

const messageOf = (error: unknown): string =>
  error instanceof Error ? `${error.name}: ${error.message}` : String(error)

/** Runs `fn`, returning what it threw and every console warning or error. */
async function capture(fn: () => unknown): Promise<string[]> {
  const seen: string[] = []
  const { warn, error } = console
  console.warn = (...args: unknown[]) =>
    void seen.push(args.map(String).join(' '))
  console.error = (...args: unknown[]) =>
    void seen.push(args.map(String).join(' '))
  try {
    await fn()
  } catch (thrown) {
    seen.push(messageOf(thrown))
  } finally {
    console.warn = warn
    console.error = error
  }
  return seen
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
