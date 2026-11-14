/**
 * The probes the scorecard gates share: what the TypeScript compiler reports
 * for a set of files, what toned's lint rules report for them, and what a
 * piece of code throws or warns.
 */
import { spawnSync } from 'node:child_process'
import { randomUUID } from 'node:crypto'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { tmpdir } from 'node:os'
import { dirname, join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

export const coreRoot = fileURLToPath(new URL('../', import.meta.url))

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
  const project = join(coreRoot, `.tsconfig.scorecard-${randomUUID()}.json`)
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

/** toned's lint plugin, beside toned-core in the workspace. */
const lintPlugin = join(coreRoot, '../toned-eslint-plugin/index.js')

/** The oxlint the plugin's own tests run. */
function oxlintBinary(): string {
  const entry = createRequire(lintPlugin).resolve('oxlint')
  return join(dirname(entry), '..', 'bin', 'oxlint')
}

/**
 * Every toned lint diagnostic per file, from one oxlint run with the
 * plugin's recommended rules and only those (oxlint's own categories off).
 * `systems` maps an import specifier to the export names that are toned
 * systems, so `ui.stylesheet(…)` from a local module is recognised.
 */
export async function lintDiagnostics(
  files: readonly string[],
  systems: Readonly<Record<string, readonly string[]>> = {},
): Promise<Map<string, string[]>> {
  const { default: plugin } = (await import(lintPlugin)) as {
    default: { configs: { recommended: { rules: Record<string, unknown> } } }
  }
  const modules = Object.fromEntries(
    Object.entries(systems).map(([specifier, names]) => [
      specifier,
      Object.fromEntries(names.map((name) => [name, 'system'])),
    ]),
  )
  const rules = Object.fromEntries(
    Object.entries(plugin.configs.recommended.rules).map(([rule, level]) => [
      rule,
      [level, { modules }],
    ]),
  )
  const directory = mkdtempSync(join(tmpdir(), 'toned-scorecard-lint-'))
  const config = join(directory, 'oxlintrc.json')
  writeFileSync(
    config,
    JSON.stringify({
      jsPlugins: [lintPlugin],
      categories: { correctness: 'off' },
      rules,
    }),
  )
  let stdout: string
  try {
    const run = spawnSync(
      oxlintBinary(),
      ['-c', config, '--format=json', ...files],
      { cwd: coreRoot, encoding: 'utf8', maxBuffer: 8_000_000 },
    )
    if (run.error) throw run.error
    stdout = run.stdout
    if (run.status !== 0 && run.status !== 1)
      throw new Error(`oxlint failed (${run.status}): ${run.stderr || stdout}`)
  } finally {
    rmSync(directory, { recursive: true, force: true })
  }
  const result = JSON.parse(stdout) as {
    diagnostics: { code: string; message: string; filename: string }[]
  }
  const byFile = new Map<string, string[]>(files.map((file) => [file, []]))
  for (const diagnostic of result.diagnostics)
    byFile
      .get(resolve(coreRoot, diagnostic.filename))
      ?.push(`${diagnostic.code}: ${diagnostic.message}`)
  return byFile
}

/** The import specifier a file in `dir` uses for `target`. */
export const specifierFrom = (dir: string, target: string): string => {
  const path = relative(dir, target)
  return path.startsWith('.') ? path : `./${path}`
}

export const messageOf = (error: unknown): string =>
  error instanceof Error ? `${error.name}: ${error.message}` : String(error)

/** Runs `fn`, returning what it threw and every console warning or error. */
export async function capture(fn: () => unknown): Promise<string[]> {
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
