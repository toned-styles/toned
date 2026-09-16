import { systemDefinition } from '../build/manifest.ts'
import type { TailwindManifest } from '../build/tailwind.ts'
import type { TokenSystem } from '../types/index.ts'
import { immutableSnapshot } from '../utils/immutable.ts'
import type { TailwindBackend } from './tailwind.ts'
import { compileTailwindPlan } from './tailwind-plan.ts'

/** Exact data schema. Serializer implementations, like token resolver functions,
 * must be versioned with application assets; function source is not a cache key. */
export function tailwindProfileDefinition(profile: TailwindBackend): string {
  return JSON.stringify({
    id: profile.id,
    mappings: profile.mappings,
    parameters: profile.parameters.map(({ field, variable, utility }) => ({
      field,
      variable,
      utility,
    })),
    classesOnly: profile.classesOnly,
  })
}

/** Runtime entry: reconstruct a build-bound backend from a published JSON
 * manifest. No Tailwind import, CSS generation, DOM access or stylesheet writes. */
export function createTailwindRuntime(
  system: TokenSystem<any>,
  profile: TailwindBackend,
  input: TailwindManifest,
) {
  if (
    input.systemId !== (system.id ?? 'legacy') ||
    input.namespace !== (system.id ?? null) ||
    input.definition !== systemDefinition(system.system)
  )
    throw new Error('Toned Tailwind: manifest system mismatch; rebuild CSS')
  if (
    input.backend !== profile.id ||
    input.profile !== tailwindProfileDefinition(profile) ||
    JSON.stringify(input.candidates) !== JSON.stringify(profile.candidates)
  )
    throw new Error('Toned Tailwind: manifest profile mismatch; rebuild CSS')
  if (input.version !== 1 || !Array.isArray(input.operations))
    throw new Error('Toned Tailwind: invalid build manifest')
  const manifest = immutableSnapshot(input)
  const plan = compileTailwindPlan(
    profile,
    system,
    manifest.operations.map((operation) => ({
      ...operation,
      value: undefined,
    })),
    false,
  )
  return Object.freeze({
    ...profile,
    browserConditions: true,
    manifest,
    resolvePlan: plan.resolvePlan,
  })
}
