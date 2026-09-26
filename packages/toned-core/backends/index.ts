import type { BuildManifest } from '../build/manifest.ts'
import type { ResolvedOperation } from '../core/plan.ts'
import type { TokenSystem } from '../types/index.ts'

/** Output adapters consume resolved fields, never selector strings or host refs. */
export type StyleFields = Readonly<Record<string, unknown>>
export type ResolvedProps = Readonly<{ style: StyleFields; className?: string }>
/**
 * Resolution is a pure, deterministic transformation of the supplied inputs.
 * Both resolve and resolvePlan must leave inputs unchanged and must not collect
 * request-local CSS, publish host updates, or perform other external effects.
 * Calls may be skipped when immutable results are reused (including a renderer's
 * module-scoped t() value across SSR requests). Object.freeze does not establish
 * function purity: custom backend implementers must uphold this contract.
 * Perform CSS collection during build and host effects at the commit boundary.
 */
export type OutputBackend = Readonly<{
  id: string
  platform: 'web' | 'native'
  browserConditions: boolean
  /** Build profiles must be bound to their validated artifact before rendering. */
  readonly requiresBuild?: boolean
  readonly manifest?: BuildManifest
  resolvePlan?(
    operations: readonly ResolvedOperation[],
    context: { system: TokenSystem<any>; part: string },
  ): ResolvedProps
  resolve(input: ResolvedProps): ResolvedProps
}>

export const cssVariablesBackend: OutputBackend = Object.freeze({
  id: 'css-vars',
  platform: 'web',
  browserConditions: true,
  resolve: (input: ResolvedProps) =>
    Object.freeze({ ...input, style: Object.freeze({ ...input.style }) }),
})

export { nativeBackend } from './native.ts'

export type {
  ParameterMapping,
  TailwindBackend,
  UtilityMapping,
} from './tailwind.ts'
export { createTailwindBackend } from './tailwind.ts'
export { createTailwindRuntime } from './tailwind-runtime.ts'
