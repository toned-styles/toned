import type { BuildManifest } from '../build/manifest.ts'
import type { ResolvedOperation } from '../core/plan.ts'
import type { TokenSystem } from '../types/index.ts'

/** Output adapters consume resolved fields, never selector strings or host refs. */
export type StyleFields = Readonly<Record<string, unknown>>
export type ResolvedProps = Readonly<{ style: StyleFields; className?: string }>
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
