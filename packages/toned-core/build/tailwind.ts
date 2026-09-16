import type { TailwindBackend } from '../backends/tailwind.ts'
import { compileTailwindPlan } from '../backends/tailwind-plan.ts'
import {
  createTailwindRuntime,
  tailwindProfileDefinition,
} from '../backends/tailwind-runtime.ts'
import {
  compilePlan,
  type ResolvedOperation,
  resolvePlan,
} from '../core/plan.ts'
import { getStylesheetPlan } from '../stylesheet/plans.ts'
import type { TokenSystem, Tokens } from '../types/index.ts'
import { assertConditionSlugs } from '../utils/conditions.ts'
import { immutableSnapshot } from '../utils/immutable.ts'
import {
  type BuildManifest,
  collectManifestConditions,
  fingerprint,
  systemDefinition,
} from './manifest.ts'
import {
  compileTailwindProfile,
  type TailwindCompiler,
} from './tailwind-compiler.ts'

export type TailwindManifest = BuildManifest &
  Readonly<{
    backend: string
    namespace: string | null
    candidates: readonly string[]
    declarations: readonly string[]
    profile: string
    operations: readonly Omit<ResolvedOperation, 'value'>[]
  }>

/** Operations must include every authoring branch and every lazy stylesheet.
 * Feed resolvePlan(..., { evaluate:false }) here, before runtime facts prune it.
 * The returned backend is bound to this inventory and rejects missing sheets.
 * The compiler is the application's actual configured Tailwind build. */
export async function buildTailwind(
  system: TokenSystem<any>,
  profile: TailwindBackend,
  options: (
    | { operations: readonly ResolvedOperation[] }
    | { sheets: readonly object[]; tokens: Tokens }
  ) & {
    source: string
    compile: TailwindCompiler
    conditions?: readonly string[]
    /** Additional externally supplied themes to validate before publication. */
    themes?: readonly Tokens[]
  },
) {
  const conditions = new Set(options.conditions ?? [])
  const operations =
    'operations' in options
      ? options.operations
      : options.sheets.flatMap((sheet) => {
          const plan = compilePlan(system, sheet, 'web')
          collectManifestConditions(getStylesheetPlan(sheet).rules, conditions)
          const themes = [
            options.tokens,
            ...Object.values(system.themes ?? {}),
            ...(options.themes ?? []),
          ]
          return themes.flatMap((tokens) =>
            Object.values(
              resolvePlan(
                plan,
                system,
                { ...options.tokens, ...tokens },
                {},
                { evaluate: false },
              ),
            ).flat(),
          )
        })
  assertConditionSlugs(system.system, conditions)
  const plan = compileTailwindPlan(profile, system, operations)
  const compiled = await compileTailwindProfile(profile, options)
  const css = `${compiled}\n${plan.css}`
  const inventory = new Map(
    operations.map(
      ({ value: _value, tokenValue: _tokenValue, ...operation }) => [
        JSON.stringify([operation.origin.id, operation.field]),
        operation,
      ],
    ),
  )
  const manifest: TailwindManifest = immutableSnapshot({
    version: 1,
    systemId: system.id ?? 'legacy',
    definition: systemDefinition(system.system),
    conditions: Object.freeze([...conditions].sort()),
    fingerprint: fingerprint(css),
    backend: profile.id,
    namespace: system.id ?? null,
    profile: tailwindProfileDefinition(profile),
    candidates: Object.freeze([...profile.candidates]),
    declarations: Object.freeze(
      [...new Set(operations.map((operation) => operation.origin.id))].sort(),
    ),
    operations: [...inventory.values()],
  })
  const backend = createTailwindRuntime(system, profile, manifest)
  return Object.freeze({ css, manifest, backend })
}

export type { TailwindCompiler } from './tailwind-compiler.ts'
export { compileTailwindProfile } from './tailwind-compiler.ts'
