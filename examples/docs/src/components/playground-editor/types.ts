import type { ComponentType } from 'react'

/**
 * The three editable files, in tab order: the interesting one first. Each is
 * one layer, and each imports only the layer below it:
 * `App.tsx` → `./styles.ts` → `./system.ts`.
 */
export const fileNames = ['styles.ts', 'App.tsx', 'system.ts'] as const
export type FileName = (typeof fileNames)[number]
export type SourceFiles = Record<FileName, string>

/** Dependencies first: the order files are transpiled and evaluated in. */
export const buildOrder = [
  'system.ts',
  'styles.ts',
  'App.tsx',
] as const satisfies readonly FileName[]

/** What each file is for, shown as the caption on its tab. */
export const fileLayers: Record<FileName, { label: string; hint: string }> = {
  'styles.ts': {
    label: 'Styles',
    hint: 'Style declarations: stylesheets, their parts and variants.',
  },
  'App.tsx': {
    label: 'Component',
    hint: 'The React component that binds the stylesheet to elements.',
  },
  'system.ts': {
    label: 'System',
    hint: 'Configuration: the design system the stylesheets are written in.',
  },
}

/** The playground file a relative import names, with or without its suffix. */
export function localFile(specifier: string): FileName | undefined {
  const stem = /^\.\/(.+?)(?:\.tsx?)?$/.exec(specifier)?.[1]
  return fileNames.find((file) => file.replace(/\.tsx?$/, '') === stem)
}

export function fileRecord<T>(value: (file: FileName) => T) {
  return Object.fromEntries(
    fileNames.map((file) => [file, value(file)]),
  ) as Record<FileName, T>
}

/** Per-file bound: keeps highlighting, transpiling and storage cheap. */
export const MAX_FILE_CHARS = 20_000

/** Everything user code may import, besides the other playground files. */
export const importableModules = [
  'react',
  '@toned/core',
  '@toned/core/server',
  '@toned/react',
  '@toned/systems/base',
] as const
export type ImportableModule = (typeof importableModules)[number]

/** One wording for the preview's import error and the editor's diagnostic. */
export function cannotImportMessage(specifier: string) {
  return `Cannot import "${specifier}". The playground provides ${importableModules
    .map((name) => `"${name}"`)
    .join(', ')}, "./system" and "./styles".`
}

export type Problem = {
  kind: 'syntax' | 'import' | 'module' | 'runtime' | 'render' | 'limit'
  message: string
  file?: FileName
  /** 1-based source position, when the transpiler reports one. */
  line?: number
  column?: number
}

export type VariantValue = string | number | boolean

export type Axis = {
  name: string
  values: readonly VariantValue[]
  /** The sheet's declared default, if any. */
  fallback?: VariantValue
}

export type SheetEntry = {
  /** Export name, e.g. `buttonStyles`. */
  name: string
  file: FileName
  sheet: object
  parts: readonly string[]
  axes: readonly string[]
  /** Owning system's id, or `legacy` for the unnamespaced base vocabulary. */
  systemId: string
}

/** Structural view of a pure Toned renderer; only `resolve` is read here. */
export type PlaygroundRenderer = {
  resolve(sheet: object, input?: { variants?: object }): unknown
}

export type Compiled = {
  id: number
  Component: ComponentType<Record<string, VariantValue>>
  sheets: readonly SheetEntry[]
  axes: readonly Axis[]
  /** Generated CSS, scoped to `[data-toned-preview="<scope>"]`. */
  css: string
  scope: string
  /** One renderer per owning system; `renderFor` picks a sheet's renderer. */
  renderers: readonly unknown[]
  renderFor(sheet: object): PlaygroundRenderer | undefined
  output: SourceFiles
  ms: number
}

export type CompileOutcome =
  | { ok: true; result: Compiled }
  | { ok: false; problem: Problem; output?: Partial<SourceFiles> }
