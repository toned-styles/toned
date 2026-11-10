/**
 * Named build outputs: CSS and data a host imports by specifier instead of
 * committing generated files.
 *
 * An outputs module default-exports (or resolves to) a record of outputs. Each
 * output may carry `css`, imported from a stylesheet as `@import 'toned:<name>'`,
 * and `data`, imported from code as `toned:<name>/<key>` (a manifest, an
 * inventory). `toned:<name>/css` is the CSS as a string, for tests and tools.
 * Modules are collected in order, and a module may import the outputs of the
 * modules before it. The Vite plugin, the Bun plugin and the Metro wrapper all
 * serve the same specifiers from the same modules.
 */
import type { BuildArtifact } from '../build/manifest.ts'

export interface TonedOutput {
  css?: string
  data?: Record<string, unknown>
}
export type TonedOutputs = Record<string, TonedOutput>

export const OUTPUT_PREFIX = 'toned:'

/** `toned:<name>` names an output's CSS; `toned:<name>/<key>` one of its modules. */
export function parseOutputSpecifier(
  id: string,
): { name: string; key?: string } | undefined {
  if (!id.startsWith(OUTPUT_PREFIX)) return undefined
  const [name, key, ...rest] = id.slice(OUTPUT_PREFIX.length).split('/')
  if (!name || rest.length > 0 || key === '') return undefined
  return key === undefined ? { name } : { name, key }
}

/** A system build artifact as an output: its CSS, and its manifest as `toned:<name>/manifest`. */
export function artifactOutput(
  artifact: BuildArtifact,
  data: Record<string, unknown> = {},
): TonedOutput {
  return { css: artifact.css, data: { ...data, manifest: artifact.manifest } }
}

/** The ES module a `toned:<name>/<key>` specifier loads. `css` is the CSS as a string. */
export function outputModuleSource(output: TonedOutput, key: string): string {
  if (key === 'css')
    return `export default ${JSON.stringify(output.css ?? '')}\n`
  if (!output.data || !(key in output.data))
    throw new Error(
      `Toned output has no "${key}"; it has: ${['css', ...Object.keys(output.data ?? {})].join(', ')}`,
    )
  return `export default ${JSON.stringify(output.data[key])}\n`
}

/** The output a specifier names, or an error listing the outputs there are. */
export function outputFor(outputs: TonedOutputs, name: string): TonedOutput {
  const output = outputs[name]
  if (output) return output
  const known = Object.keys(outputs)
  throw new Error(
    `${OUTPUT_PREFIX}${name} is not a Toned output; the outputs are: ${known.length ? known.join(', ') : '(none)'}`,
  )
}

function isOutputs(value: unknown): value is TonedOutputs {
  if (!value || typeof value !== 'object') return false
  return Object.values(value).every(
    (output) =>
      !!output &&
      typeof output === 'object' &&
      (!('css' in output) || typeof output.css === 'string'),
  )
}

/**
 * Load outputs modules in order and merge what they export. `load` receives the
 * outputs collected so far, which the module may import.
 */
export async function collectOutputs(
  modules: readonly string[],
  load: (module: string, earlier: Readonly<TonedOutputs>) => Promise<unknown>,
): Promise<TonedOutputs> {
  const outputs: TonedOutputs = {}
  for (const module of modules) {
    const exported = await load(module, outputs)
    const value =
      exported && typeof exported === 'object' && 'default' in exported
        ? await (exported as { default: unknown }).default
        : exported
    if (!isOutputs(value))
      throw new Error(
        `Toned outputs module ${module} must default-export a record of outputs`,
      )
    for (const [name, output] of Object.entries(value)) {
      if (name in outputs)
        throw new Error(`Toned output "${name}" is exported twice (${module})`)
      if (!/^[\w.-]+$/.test(name))
        throw new Error(`Toned output name "${name}" is not a file name`)
      outputs[name] = output
    }
  }
  return outputs
}
