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
export interface TonedOutput {
  css?: string
  data?: Record<string, unknown>
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

/** What an output file default-exports, as an output: an artifact's manifest becomes `data.manifest`. */
export function toOutput(exported: unknown, file: string): TonedOutput {
  const value =
    exported && typeof exported === 'object' && 'default' in exported
      ? (exported as { default: unknown }).default
      : exported
  if (!value || typeof value !== 'object')
    throw new Error(`Toned output ${file} must default-export { css, manifest } or { css?, data? }`)
  const { css, manifest, data } = value as { css?: unknown; manifest?: unknown; data?: unknown }
  if (css !== undefined && typeof css !== 'string')
    throw new Error(`Toned output ${file}: css must be a string`)
  if (data !== undefined && (!data || typeof data !== 'object'))
    throw new Error(`Toned output ${file}: data must be an object`)
  return {
    css,
    data: { ...(data as Record<string, unknown>), ...(manifest === undefined ? {} : { manifest }) },
  }
}

/** The ES module a `toned:<name>/<key>` specifier loads. `css` is the CSS as a string. */
export function outputModuleSource(output: TonedOutput, key: string): string {
  if (key === 'css') return `export default ${JSON.stringify(output.css ?? '')}\n`
  if (!output.data || !(key in output.data))
    throw new Error(
      `Toned output has no "${key}"; it has: ${['css', ...Object.keys(output.data ?? {})].join(', ')}`,
    )
  return `export default ${JSON.stringify(output.data[key])}\n`
}

/** The file that provides `name`, or an error listing the outputs there are. */
export function outputFile(files: Readonly<Record<string, string>>, name: string): string {
  const file = files[name]
  if (file) return file
  const known = Object.keys(files)
  throw new Error(
    `${OUTPUT_PREFIX}${name} is not a Toned output; the outputs are: ${known.length ? known.join(', ') : '(none)'}`,
  )
}
