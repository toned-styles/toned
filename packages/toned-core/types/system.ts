/**
 * Token system type definitions.
 *
 * @module types/system
 */

import type { Config } from './config.ts'
import type { StylesheetType, TFun } from './stylesheet.ts'
import type {
  Breakpoints,
  TokenStyle,
  TokenStyleDeclaration,
  Tokens,
} from './tokens.ts'

/**
 * Runtime inputs for {@link TokenSystem.exec}.
 *
 * Breakpoint and pseudo overrides compile to CSS custom properties, so `exec`
 * has to know whether the active runtime consumes them. The mode fields are
 * optional and resolved through `resolveModes`, the same rule a {@link Config}
 * uses — so an `ExecConfig` assembled by hand defaults exactly as one spread
 * from a config would, and `useMedia` alone is enough to describe the media
 * behaviour.
 *
 * Omitting them can never mean `'css'`, which matters: `'css'` is an assertion
 * that the target consumes custom properties, and it is false on React Native.
 * The conservative default drops the overrides, keeps the base token values and
 * warns, rather than emitting `var()` strings a native runtime cannot read.
 */
export type ExecConfig = {
  /** Token values for style resolution */
  tokens: Tokens

  /** Whether to emit class names for static token values */
  useClassName?: boolean
} & Partial<Pick<Config, 'mediaMode' | 'pseudoMode' | 'useMedia'>>

/**
 * Complete token system - returned from defineSystem().
 * Provides stylesheet creation, inline styling, and style execution.
 *
 * @template S - The token style declaration
 * @template SystemConfig - Optional configuration including breakpoints
 *
 * @example
 * ```ts
 * const { t, stylesheet } = defineSystem({
 *   bgColor: defineToken({ ... }),
 *   padding: defineToken({ ... }),
 * })
 * ```
 */
export type TokenSystem<
  S extends TokenStyleDeclaration,
  // biome-ignore lint/suspicious/noExplicitAny: breakpoints config is generic
  SystemConfig extends { breakpoints?: Breakpoints<any> } = {
    // biome-ignore lint/suspicious/noExplicitAny: default config type
    breakpoints?: Breakpoints<any>
  },
> = {
  /** The token definitions */
  system: S

  /** Optional system configuration (breakpoints, etc.) */
  config?: SystemConfig

  /** Create a stylesheet with element definitions */
  stylesheet: StylesheetType<S>

  /** Create inline styles from token values */
  t: TFun<S>

  /** Execute token style resolution */
  exec: (
    config: ExecConfig,
    tokenStyle: TokenStyle<S>,
  ) => { style: object; className?: string }
}
