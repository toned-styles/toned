import { resolveCssPlan } from '../backends/css/plan.ts'
/** Pure resolution: no React imports, global config installation or host writes. */
import type { OutputBackend, ResolvedProps } from '../backends/index.ts'
import { cssVariablesBackend, nativeBackend } from '../backends/index.ts'
import type { BuildManifest } from '../build/index.ts'
import {
  assertManifestConditions,
  systemDefinition,
} from '../build/manifest.ts'
import {
  compilePlan,
  explain as explainPlan,
  foldOperations,
  resolvePlan,
} from '../core/plan.ts'
import { getStylesheetPlan } from '../stylesheet/plans.ts'
import type { SystemTheme } from '../system/theme-types.ts'
import type {
  TokenStyleDeclaration,
  TokenSystem,
  Tokens,
} from '../types/index.ts'
import { immutableSnapshot } from '../utils/immutable.ts'
import { resolvePlatformKeys } from '../utils/platform.ts'
import { SYMBOL_DEFAULTS } from '../utils/symbols.ts'

type SheetMeta<T> = T extends { readonly __toned__?: infer M } ? M : never
type SheetVariants<T> = SheetMeta<T> extends {
  mods: infer M
  defaults: infer D
}
  ? [M] extends [never]
    ? never
    : Omit<M, keyof D> & Partial<Pick<M, Extract<keyof D, keyof M>>>
  : SheetMeta<T> extends { mods: infer M }
    ? M
    : never
type SheetOutput<T> = SheetMeta<T> extends { elements: infer E }
  ? Readonly<{ [K in keyof E]: ResolvedProps }>
  : Readonly<Record<string, ResolvedProps>>
type RuntimeInput = {
  variants?: object
  facts?: Readonly<Record<string, unknown>>
  tokens?: Tokens
}
type Input<T, Theme> = {
  variants: SheetVariants<T>
  facts?: Readonly<Record<string, string | number | boolean>>
  tokens?: Theme
}
type Arguments<T, Theme> = [SheetVariants<T>] extends [never]
  ? [input?: Omit<RuntimeInput, 'variants' | 'tokens'> & { tokens?: Theme }]
  : {} extends SheetVariants<T>
    ? [input?: Partial<Input<T, Theme>>]
    : [input: Input<T, Theme>]

export function createRenderer<S extends TokenStyleDeclaration>(
  system: TokenSystem<S>,
  options: {
    backend: OutputBackend
    manifest?: BuildManifest
    tokens: SystemTheme<NoInfer<S>>
  },
) {
  const backend = Object.freeze({ ...options.backend })
  if (backend.requiresBuild && !backend.manifest)
    throw new Error(
      'Toned renderer: backend requires a validated build artifact; use buildTailwind and createTailwindRuntime',
    )
  if (
    backend.requiresBuild &&
    options.manifest &&
    options.manifest.fingerprint !== backend.manifest?.fingerprint
  )
    throw new Error(
      'Toned renderer: supplied manifest does not match the bound backend artifact',
    )
  const manifest = options.manifest ?? backend.manifest
  if (
    manifest &&
    (manifest.systemId !== (system.id ?? 'legacy') ||
      manifest.namespace !== (system.id ?? null))
  )
    throw new Error(
      'Toned renderer: build manifest belongs to a different system namespace',
    )
  if (manifest && manifest.definition !== systemDefinition(system.system))
    throw new Error(
      'Toned renderer: build manifest has a different system definition; regenerate CSS',
    )
  const tokens = immutableSnapshot(options.tokens)
  const validate = (sheet: object) => {
    const plan = getStylesheetPlan(sheet)
    if (plan.ref !== (system as unknown))
      throw new Error(
        'Toned renderer: stylesheet belongs to a different system',
      )
    if (backend.browserConditions && !manifest)
      throw new Error(
        'Toned web renderer: a pre-generated CSS manifest is required',
      )
    if (backend.id === 'css-vars' && manifest)
      assertManifestConditions(
        manifest,
        resolvePlatformKeys(plan.rules, backend.platform),
      )
  }
  const inputs = (sheet: object, input: RuntimeInput) => ({
    ...((sheet as Record<symbol, object>)[SYMBOL_DEFAULTS] ?? {}),
    ...Object.fromEntries(
      Object.entries(input.variants ?? {}).filter(
        ([, value]) => value !== undefined,
      ),
    ),
    ...input.facts,
  })
  const renderer = Object.freeze({
    backend,
    system,
    tokens,
    manifest,
    validate,
    explain<T extends object>(
      sheet: T,
      ...args: Arguments<T, SystemTheme<S>>
    ): ReturnType<typeof explainPlan> & { output: SheetOutput<T> } {
      validate(sheet)
      const input = (args[0] ?? {}) as RuntimeInput
      return {
        ...explainPlan(
          compilePlan(system, sheet, backend.platform),
          system,
          input.tokens ?? tokens,
          inputs(sheet, input),
        ),
        output: renderer.resolve(sheet, ...args),
      }
    },
    resolve<T extends object>(
      sheet: T,
      ...args: Arguments<T, SystemTheme<S>>
    ): SheetOutput<T> {
      validate(sheet)
      const input = (args[0] ?? {}) as RuntimeInput
      const facts = inputs(sheet, input)
      const activeTokens = input.tokens ?? tokens
      const result: Record<string, ResolvedProps> = {}
      if (backend.id !== 'css-vars') {
        const plan = compilePlan(system, sheet, backend.platform)
        const selected = resolvePlan(plan, system, activeTokens, facts, {
          preserveConditions: backend.browserConditions,
        })
        for (const part of plan.parts)
          result[part] = backend.resolvePlan
            ? backend.resolvePlan(selected[part]!, { system, part })
            : backend.resolve(foldOperations(selected[part]!))
      } else {
        Object.assign(
          result,
          resolveCssPlan(
            compilePlan(system, sheet, 'web'),
            system,
            activeTokens,
            facts,
          ),
        )
      }
      return immutableSnapshot(result) as SheetOutput<T>
    },
  })
  return renderer
}

export function createWebRenderer<S extends TokenStyleDeclaration>(
  system: TokenSystem<S>,
  options: { manifest: BuildManifest; tokens: SystemTheme<NoInfer<S>> },
) {
  return createRenderer(system, { ...options, backend: cssVariablesBackend })
}
export function createNativeRenderer<S extends TokenStyleDeclaration>(
  system: TokenSystem<S>,
  options: { tokens: SystemTheme<NoInfer<S>> },
) {
  return createRenderer(system, { ...options, backend: nativeBackend })
}
