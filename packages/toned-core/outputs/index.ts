/**
 * Named build outputs: CSS and data a host imports by specifier instead of
 * committing generated files.
 *
 * Each output is one file, `<name>.toned.ts`, whose default export is a build
 * artifact (what `buildStyles` returns: `{ css, manifest }`) or `{ css?, data? }`.
 * A stylesheet imports its CSS as `@import 'toned:<name>'`; code imports
 * `toned:<name>/manifest` or another `data` key; `toned:<name>/css` is the CSS
 * as a string. An output may import other outputs. The Vite plugin, the Bun
 * plugin and the Metro wrapper find outputs by glob and serve the same specifiers.
 */
import { dirname, isAbsolute, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

export interface TonedOutput {
  css?: string
  data?: Record<string, unknown>
  /** Absolute paths of files the output read outside its imports. */
  inputs?: string[]
}

export const OUTPUT_PREFIX = 'toned:'
const OUTPUT_FILE = /\.toned\.[cm]?[jt]sx?$/

/** `toned:<name>` names an output's CSS; `toned:<name>/<key>` one of its modules. */
export function parseOutputSpecifier(id: string): { name: string; key?: string } | undefined {
  if (!id.startsWith(OUTPUT_PREFIX)) return undefined
  const [name, key, ...rest] = id.slice(OUTPUT_PREFIX.length).split('/')
  if (!name || rest.length > 0 || key === '') return undefined
  return key === undefined ? { name } : { name, key }
}

/** The output a file provides: `daylight.toned.ts` is `daylight`. */
export function outputName(file: string): string | undefined {
  const base = file.split(/[\\/]/).pop() ?? ''
  return OUTPUT_FILE.test(base) ? base.replace(OUTPUT_FILE, '') : undefined
}

/** A JSON value: what an output's data may hold, since it is served as a module. */
export type OutputJson =
  | string
  | number
  | boolean
  | null
  | readonly OutputJson[]
  | { readonly [key: string]: OutputJson | undefined }

/**
 * What an output file default-exports: a `buildStyles` artifact, or CSS and data.
 * Never a promise: an asynchronous build is awaited at the top level.
 */
export type OutputDefinition = { readonly then?: never } & (
  | Readonly<{
      css: string
      manifest: OutputJson | object
      data?: Readonly<Record<string, OutputJson>>
      inputs?: readonly (string | URL)[]
    }>
  | Readonly<{
      css?: string
      data?: Readonly<Record<string, OutputJson>>
      /**
       * Files the output reads outside its imports (`readFile`), relative to the
       * output file. Dev servers rebuild the output when one changes, and Bun's
       * shared cache checks them as it checks imported sources.
       */
      inputs?: readonly (string | URL)[]
    }>
)

/**
 * Types an output file's default export: `export default defineOutput({ css, data })`.
 * A misspelled key, data that is not JSON or an unawaited promise is a type error.
 */
export const defineOutput = <const T extends OutputDefinition>(
  output: T & NoInfer<ExactOutput<T>>,
): T => output

/** No key beyond an output's. */
type ExactOutput<T> = { [K in Exclude<keyof T, OUTPUT_KEY>]: never }
type OUTPUT_KEY = (typeof OUTPUT_KEYS)[number]
const OUTPUT_KEYS = ['css', 'manifest', 'data', 'inputs'] as const
const RESERVED_DATA_KEYS = new Set(['css'])

const isThenable = (value: unknown): boolean =>
  !!value &&
  (typeof value === 'object' || typeof value === 'function') &&
  typeof (value as { then?: unknown }).then === 'function'

/** Levenshtein distance, for "did you mean" on a short fixed vocabulary. */
function distance(a: string, b: string): number {
  let row = Array.from({ length: b.length + 1 }, (_, i) => i)
  for (let i = 1; i <= a.length; i++) {
    const next = [i]
    for (let j = 1; j <= b.length; j++)
      next[j] = Math.min(
        (row[j] ?? 0) + 1,
        (next[j - 1] ?? 0) + 1,
        (row[j - 1] ?? 0) + (a[i - 1] === b[j - 1] ? 0 : 1),
      )
    row = next
  }
  return row[b.length] ?? 0
}

function suggestion(key: string): string {
  const lower = key.toLowerCase()
  const near = OUTPUT_KEYS.find(known => known === lower || distance(lower, known) <= 2)
  return near ? `; did you mean "${near}"?` : '.'
}

/** Why `value` is not JSON, naming where (`data.usage[0]`), or undefined when it is. */
function notJson(value: unknown, at: string): string | undefined {
  if (value === null || typeof value === 'string' || typeof value === 'boolean') return
  if (typeof value === 'number')
    return Number.isFinite(value) ? undefined : `${at} is ${value}`
  if (isThenable(value)) return `${at} is a promise: await it`
  if (typeof value !== 'object') return `${at} is a ${typeof value}`
  if (Array.isArray(value)) {
    for (const [i, item] of value.entries()) {
      const why = notJson(item, `${at}[${i}]`)
      if (why) return why
    }
    return
  }
  const proto = Object.getPrototypeOf(value)
  if (proto !== Object.prototype && proto !== null)
    return `${at} is a ${(value as object).constructor?.name ?? 'class instance'}`
  for (const [key, item] of Object.entries(value)) {
    if (item === undefined) continue
    const why = notJson(item, `${at}.${key}`)
    if (why) return why
  }
}

const JSON_RULE = 'must be JSON (strings, finite numbers, booleans, null, arrays and plain objects)'

/**
 * What an output file default-exports, as an output: an artifact's manifest
 * becomes `data.manifest`, and `inputs` resolve against the output file. Any
 * shape that would serve empty or wrong modules is an error naming the fix.
 */
export function toOutput(exported: unknown, file: string): TonedOutput {
  const value =
    exported && typeof exported === 'object' && 'default' in exported
      ? (exported as { default: unknown }).default
      : exported
  const fail = (why: string) => new Error(`Toned output ${file}${why}`)
  if (isThenable(value))
    throw fail(' default-exports a promise: await it (`export default await build()`)')
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw fail(' must default-export { css, manifest } (a buildStyles artifact) or { css?, data? }')
  for (const key of Object.keys(value))
    if (!(OUTPUT_KEYS as readonly string[]).includes(key))
      throw fail(`: unknown key "${key}"${suggestion(key)} An output has ${OUTPUT_KEYS.join(', ')}`)
  const { css, manifest, data, inputs } = value as Record<string, unknown>
  if (isThenable(css)) throw fail(': css is a promise: await it')
  if (css !== undefined && typeof css !== 'string') throw fail(': css must be a string')
  if (data !== undefined && (!data || typeof data !== 'object' || Array.isArray(data)))
    throw fail(': data must be an object of named entries, each imported as toned:<name>/<key>')
  if (css === undefined && data === undefined && manifest === undefined)
    throw fail(' has no css or data: export { css } or { data } (or a buildStyles artifact)')
  const entries: Record<string, unknown> = { ...(data as Record<string, unknown>) }
  if (manifest !== undefined) entries['manifest'] = manifest
  for (const [key, entry] of Object.entries(entries)) {
    if (RESERVED_DATA_KEYS.has(key))
      throw fail(`: data key "${key}" is reserved: toned:<name>/${key} is the CSS`)
    if (!/^[\w.-]+$/.test(key))
      throw fail(`: data key "${key}" cannot be imported; use letters, digits, ".", "_" or "-"`)
    const why = notJson(entry, key === 'manifest' && manifest !== undefined ? 'manifest' : `data.${key}`)
    if (why) throw fail(`: ${why}; data ${JSON_RULE}`)
  }
  if (inputs !== undefined && (!Array.isArray(inputs) || inputs.some(input => typeof input !== 'string' && !(input instanceof URL))))
    throw fail(': inputs must be an array of file paths or URLs')
  return {
    css: css as string | undefined,
    data: entries,
    ...(inputs === undefined
      ? {}
      : { inputs: (inputs as (string | URL)[]).map(input => resolveInput(file, input)) }),
  }
}

function resolveInput(file: string, input: string | URL): string {
  if (input instanceof URL) return fileURLToPath(input)
  return isAbsolute(input) ? input : resolve(dirname(file), input)
}

/** The ES module a `toned:<name>/<key>` specifier loads. `css` is the CSS as a string. */
export function outputModuleSource(output: TonedOutput, key: string, name?: string): string {
  if (key === 'css') return `export default ${JSON.stringify(output.css ?? '')}\n`
  if (!output.data || !(key in output.data))
    throw new Error(
      `${name === undefined ? 'Toned output' : OUTPUT_PREFIX + name} has no "${key}"; it has: ${['css', ...Object.keys(output.data ?? {})].join(', ')}`,
    )
  return `export default ${JSON.stringify(output.data[key])}\n`
}

/** The file that provides `name`, or an error listing the outputs there are. */
export function outputFile(files: Readonly<Record<string, string>>, name: string): string {
  const file = files[name]
  if (file) return file
  throw unknownOutputError(name, Object.keys(files))
}

/** The error for a `toned:<name>` that no output file declares, naming the outputs there are. */
export function unknownOutputError(name: string, known: readonly string[]): Error {
  return new Error(
    `${OUTPUT_PREFIX}${name} is not a Toned output; the outputs are: ${known.length ? known.join(', ') : '(none)'}`,
  )
}
