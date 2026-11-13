/**
 * The two probes every scorecard gate shares: what the TypeScript compiler
 * reports for a set of files, and what a piece of code throws or warns.
 */
import { spawnSync } from 'node:child_process'
import { randomUUID } from 'node:crypto'
import { rmSync, writeFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, join, resolve } from 'node:path'
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
