/**
 * The playground's in-browser build: transpile each file with TypeScript,
 * evaluate it against a fixed module map, then build the exported sheets'
 * CSS with the same `buildStyles` + `createWebRenderer` pair a real app uses.
 *
 * Loaded lazily from an effect, so neither TypeScript nor this module is part
 * of the server render. Nothing here writes files or touches the network.
 */
import * as tonedCore from '@toned/core'
import { buildStyles } from '@toned/core/build'
import * as tonedServer from '@toned/core/server'
import { createWebRenderer } from '@toned/core/server'
import { getStylesheetPlan } from '@toned/core/stylesheet'
import * as tonedReact from '@toned/react'
import * as tonedBase from '@toned/systems/base'
import * as React from 'react'
import * as jsxRuntime from 'react/jsx-runtime'
import type {
  Axis,
  Compiled,
  CompileOutcome,
  FileName,
  PlaygroundRenderer,
  Problem,
  SheetEntry,
  SourceFiles,
  VariantValue,
} from './types.ts'
import {
  cannotImportMessage,
  fileNames,
  type ImportableModule,
  importableModules,
  MAX_FILE_CHARS,
} from './types.ts'

type TypeScript = typeof import('typescript')

/** Everything user code may import. Anything else is a friendly error. */
const modules: Record<ImportableModule | 'react/jsx-runtime', unknown> = {
  react: React,
  'react/jsx-runtime': jsxRuntime,
  '@toned/core': tonedCore,
  '@toned/core/server': tonedServer,
  '@toned/react': tonedReact,
  '@toned/systems/base': tonedBase,
}
export const availableModules: readonly string[] = importableModules

const SYMBOL_DEFAULTS = Symbol.for('@toned/core/SYMBOL_DEFAULTS')

let typescript: Promise<TypeScript> | undefined
export function loadTypeScript() {
  typescript ??= import('typescript').then(
    (mod) => ((mod as { default?: TypeScript }).default ?? mod) as TypeScript,
  )
  return typescript
}

class ProblemError extends Error {
  constructor(readonly problem: Problem) {
    super(problem.message)
  }
}

function transpile(ts: TypeScript, file: FileName, source: string) {
  const result = ts.transpileModule(source, {
    fileName: file,
    reportDiagnostics: true,
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      jsx: ts.JsxEmit.ReactJSX,
      esModuleInterop: true,
      isolatedModules: true,
      removeComments: false,
    },
  })
  const error = result.diagnostics?.find(
    (item) => item.category === ts.DiagnosticCategory.Error,
  )
  if (error) {
    const position =
      error.file && error.start !== undefined
        ? error.file.getLineAndCharacterOfPosition(error.start)
        : undefined
    throw new ProblemError({
      kind: 'syntax',
      file,
      line: position ? position.line + 1 : undefined,
      column: position ? position.character + 1 : undefined,
      message: ts.flattenDiagnosticMessageText(error.messageText, '\n'),
    })
  }
  return result.outputText
}

type ModuleRecord = { exports: Record<string, unknown> }

function evaluate(output: SourceFiles) {
  const cache = new Map<FileName, ModuleRecord>()
  const loading = new Set<FileName>()

  const load = (file: FileName): ModuleRecord => {
    const cached = cache.get(file)
    if (cached) return cached
    if (loading.has(file))
      throw new ProblemError({
        kind: 'import',
        file,
        message: `${file} imports itself through a cycle.`,
      })
    loading.add(file)
    const record: ModuleRecord = { exports: {} }
    const require = (specifier: string) => {
      if (Object.hasOwn(modules, specifier))
        return modules[specifier as keyof typeof modules]
      const local = specifier.replace(/^\.\//, '').replace(/\.(ts|tsx)$/, '')
      if (specifier.startsWith('./') && local === 'styles')
        return load('styles.ts').exports
      if (specifier.startsWith('./') && local === 'App')
        return load('App.tsx').exports
      throw new ProblemError({
        kind: 'import',
        file,
        message: cannotImportMessage(specifier),
      })
    }
    try {
      // User code runs in this page, like typing it into the console: it is
      // only ever the visitor's own draft, never code loaded from a URL.
      const run = new Function(
        'require',
        'exports',
        'module',
        `${output[file]}\n//# sourceURL=toned-playground/${file}`,
      ) as (
        require: (specifier: string) => unknown,
        exports: Record<string, unknown>,
        module: ModuleRecord,
      ) => void
      run(require, record.exports, record)
    } catch (error) {
      if (error instanceof ProblemError) throw error
      throw new ProblemError({
        kind: 'runtime',
        file,
        message: error instanceof Error ? error.message : String(error),
      })
    } finally {
      loading.delete(file)
    }
    cache.set(file, record)
    return record
  }

  return { styles: load('styles.ts'), app: load('App.tsx') }
}

function planOf(value: unknown) {
  if (!value || (typeof value !== 'object' && typeof value !== 'function'))
    return undefined
  try {
    return getStylesheetPlan(value)
  } catch {
    return undefined
  }
}

function toVariantValue(raw: string): VariantValue {
  if (raw === 'true') return true
  if (raw === 'false') return false
  if (/^-?\d+(\.\d+)?$/.test(raw)) return Number(raw)
  return raw
}

/** Axis values evidenced by the sheet's canonical `[axis=value]` rule keys. */
function collectAxisValues(
  rules: unknown,
  axes: ReadonlySet<string>,
  into: Map<string, Set<string>>,
  depth = 0,
) {
  if (!rules || typeof rules !== 'object' || depth > 6) return
  for (const [key, value] of Object.entries(rules)) {
    for (const match of key.matchAll(/\[([\w-]+)=([^\]]+)\]/g)) {
      const [, axis, raw] = match
      if (axis && raw && axes.has(axis)) {
        const values = into.get(axis) ?? new Set<string>()
        values.add(raw)
        into.set(axis, values)
      }
    }
    collectAxisValues(value, axes, into, depth + 1)
  }
}

let baseSystem: unknown
function isBaseSystem(system: unknown) {
  baseSystem ??= getStylesheetPlan(tonedBase.stylesheet({ Root: {} })).ref
  return system === baseSystem
}

function isComponent(value: unknown) {
  return (
    typeof value === 'function' ||
    (typeof value === 'object' && value !== null && '$$typeof' in value)
  )
}

export async function compile(
  files: SourceFiles,
  id: number,
): Promise<CompileOutcome> {
  for (const file of fileNames)
    if (files[file].length > MAX_FILE_CHARS)
      return {
        ok: false,
        problem: {
          kind: 'limit',
          file,
          message: `${file} is ${files[file].length.toLocaleString('en-GB')} characters. Keep each file under ${MAX_FILE_CHARS.toLocaleString('en-GB')} to preview it.`,
        },
      }

  const ts = await loadTypeScript()
  const started = performance.now()
  const output: Partial<SourceFiles> = {}
  try {
    for (const file of fileNames)
      output[file] = transpile(ts, file, files[file])
    const { styles, app } = evaluate(output as SourceFiles)

    const Component = app.exports.default ?? app.exports.App
    if (!isComponent(Component))
      throw new ProblemError({
        kind: 'module',
        file: 'App.tsx',
        message:
          'Export your component from App.tsx: `export default function App() { … }`.',
      })

    // Every exported stylesheet, from either file, in declaration order.
    const seen = new Set<object>()
    const sheets: SheetEntry[] = []
    const systems = new Map<object, object[]>()
    for (const [file, record] of [
      ['styles.ts', styles],
      ['App.tsx', app],
    ] as const) {
      for (const [name, value] of Object.entries(record.exports)) {
        const plan = planOf(value)
        if (!plan || seen.has(value as object)) continue
        seen.add(value as object)
        const system = plan.ref as unknown as object & { id?: string }
        if (system.id === undefined && !isBaseSystem(system))
          throw new ProblemError({
            kind: 'module',
            file,
            message: `${name} belongs to a system without an id. Declare it as defineSystem({ id: 'my-system', tokens: { … } }) so its CSS stays namespaced inside the preview.`,
          })
        sheets.push({
          name,
          file,
          sheet: value as object,
          parts: plan.parts,
          axes: plan.variantAxes,
          systemId: system.id ?? 'legacy',
        })
        systems.set(system, [...(systems.get(system) ?? []), value as object])
      }
    }

    const scope = `p${id}`
    const renderers = new Map<object, PlaygroundRenderer>()
    let css = ''
    try {
      for (const [system, systemSheets] of systems) {
        const artifact = buildStyles(
          system as Parameters<typeof buildStyles>[0],
          { sheets: systemSheets, scope: `[data-toned-preview="${scope}"]` },
        )
        css += `${artifact.css}\n`
        renderers.set(
          system,
          createWebRenderer(system as Parameters<typeof buildStyles>[0], {
            manifest: artifact.manifest,
          }) as unknown as PlaygroundRenderer,
        )
      }
    } catch (error) {
      throw new ProblemError({
        kind: 'runtime',
        file: 'styles.ts',
        message: `Building CSS failed: ${error instanceof Error ? error.message : String(error)}`,
      })
    }

    const axisValues = new Map<string, Set<string>>()
    const fallbacks = new Map<string, VariantValue>()
    for (const entry of sheets) {
      // Defaults first, so each control lists the resting value first.
      const defaults = (entry.sheet as Record<symbol, unknown>)[
        SYMBOL_DEFAULTS
      ] as Record<string, VariantValue> | undefined
      for (const [axis, value] of Object.entries(defaults ?? {})) {
        if (!fallbacks.has(axis)) fallbacks.set(axis, value)
        const values = axisValues.get(axis) ?? new Set<string>()
        values.add(String(value))
        axisValues.set(axis, values)
      }
      collectAxisValues(
        getStylesheetPlan(entry.sheet).rules,
        new Set(entry.axes),
        axisValues,
      )
    }
    const axes: Axis[] = [...axisValues].map(([name, raw]) => {
      const values = [...raw].map(toVariantValue)
      // A boolean axis evidenced by only `true` still toggles.
      const booleans = values.every((value) => typeof value === 'boolean')
      return {
        name,
        values: booleans ? [false, true] : values,
        fallback: fallbacks.get(name),
      }
    })

    const result: Compiled = {
      id,
      Component: Component as Compiled['Component'],
      sheets,
      axes,
      css,
      scope,
      renderers: [...renderers.values()],
      renderFor: (sheet) => {
        const plan = planOf(sheet)
        return plan ? renderers.get(plan.ref) : undefined
      },
      output: output as SourceFiles,
      ms: performance.now() - started,
    }
    return { ok: true, result }
  } catch (error) {
    const problem =
      error instanceof ProblemError
        ? error.problem
        : {
            kind: 'runtime' as const,
            message: error instanceof Error ? error.message : String(error),
          }
    return { ok: false, problem, output }
  }
}
