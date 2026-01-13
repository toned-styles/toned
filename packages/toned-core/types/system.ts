/**
 * Token system type definitions.
 *
 * @module types/system
 */

import type { StylesheetType, TFun } from './stylesheet.ts'
import type {
  Breakpoints,
  TokenStyle,
  TokenStyleDeclaration,
  Tokens,
} from './tokens.ts'

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
    config: {
      tokens: Tokens
      useClassName?: boolean
    },
    tokenStyle: TokenStyle<S>,
  ) => { style: object; className?: string }
}
