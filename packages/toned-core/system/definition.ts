import type { LayoutContext, LogicalLength } from '../core/values.ts'
import { isLogicalLength } from '../core/values.ts'
import type {
  AnimationInput,
  Breakpoints,
  BridgeConfig,
} from '../types/index.ts'
import { immutableSnapshot } from '../utils/immutable.ts'
import type { SystemTheme } from './theme-types.ts'

export type SystemOptions = {
  layoutContext?: LayoutContext
  /** Canonical named viewport thresholds in fixed logical pixels. */
  media?: Record<string, number | (LogicalLength & { unit: 'dp' })>
  // biome-ignore lint/suspicious/noExplicitAny: breakpoints config uses generic parameter
  breakpoints?: Breakpoints<any>
  animations?: Record<string, AnimationInput>
  bridges?: Record<string, BridgeConfig>
  states?: Record<string, string>
  /** See `TokenStyleDeclaration.responsiveTokens`. */
  responsiveTokens?: readonly string[]
  /** See `TokenStyleDeclaration.containers`. */
  containers?: Record<
    string,
    Record<string, number | string | (LogicalLength & { unit: 'dp' })>
  >
  /** See `TokenStyleDeclaration.base` — px per numeric unit (default 4). */
  base?: number
}
/** Portable named query thresholds are fixed logical lengths. Legacy systems
 * retain their explicit CSS/string and spacing-step interpretation. */
type FixedConditions<C> = {
  [K in keyof C]: K extends 'breakpoints'
    ? C[K] extends { __breakpoints: infer B }
      ? {
          __breakpoints: {
            [N in keyof B]: B[N] extends
              | number
              | (LogicalLength & { unit: 'dp' })
              ? B[N]
              : never
          }
        }
      : never
    : K extends 'containers'
      ? {
          [N in keyof C[K]]: {
            [Step in keyof C[K][N]]: C[K][N][Step] extends
              | number
              | LogicalLength
              ? C[K][N][Step]
              : never
          }
        }
      : C[K]
}
export function fixedConditions<C extends SystemOptions>(
  conditions: C | undefined,
): C | undefined {
  if (!conditions) return conditions
  if (conditions.layoutContext) {
    const { direction, writingMode } = conditions.layoutContext
    if (direction !== undefined && !['ltr', 'rtl'].includes(direction))
      throw new Error('Toned: unsupported layout direction')
    if (
      writingMode !== undefined &&
      !['horizontal-tb', 'vertical-rl', 'vertical-lr'].includes(writingMode)
    )
      throw new Error('Toned: unsupported layout writing mode')
  }
  const fixed = (value: unknown, path: string): number => {
    if (isLogicalLength(value) && value.unit === 'dp') value = value.value
    if (typeof value !== 'number' || !Number.isFinite(value) || value < 0)
      throw new Error(
        `Toned: ${path} must be a fixed nonnegative logical-pixel threshold; rem, variables and themeable spacing are not portable`,
      )
    return value
  }
  if (conditions.media && conditions.breakpoints)
    throw new Error('Toned: declare media or legacy breakpoints, not both')
  const widths = conditions.media ?? conditions.breakpoints?.__breakpoints
  const breakpoints = widths && {
    __breakpoints: Object.fromEntries(
      Object.entries(widths).map(([name, value]) => [
        name,
        fixed(value, `media.${name}`),
      ]),
    ),
  }
  // Canonical px literals survive the legacy evaluator's spacing multiplier.
  // The compiler and the native evaluator therefore read the identical value.
  const containers =
    conditions.containers &&
    Object.fromEntries(
      Object.entries(conditions.containers).map(([name, steps]) => [
        name,
        Object.fromEntries(
          Object.entries(steps).map(([step, value]) => [
            step,
            `${fixed(value, `container.${name}.${step}`)}px`,
          ]),
        ),
      ]),
    )
  return immutableSnapshot({
    ...conditions,
    ...(breakpoints ? { breakpoints } : {}),
    ...(containers ? { containers } : {}),
  }) as C
}
export type SystemDefinition<S, C> = {
  id: string
  layout?: LayoutContext
  tokens: S
  conditions?: C & FixedConditions<C>
  themes?: Readonly<Record<string, SystemTheme<NoInfer<S>>>>
}
