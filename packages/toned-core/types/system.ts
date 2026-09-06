/**
 * Token system type definitions.
 *
 * @module types/system
 */

import type {
  Condition,
  ContainerConditionBuilder,
} from '../system/conditions.ts'
import type { StylesheetType, TFun } from './stylesheet.ts'
import type {
  Breakpoints,
  TokenStyle,
  TokenStyleDeclaration,
  Tokens,
} from './tokens.ts'

/** The container names a system config declares — never matches when absent. */
type ContainerNamesOf<C> = C extends { containers: infer Ct }
  ? keyof Ct & string
  : never

/** The breakpoint names a system config declares. */
type BreakpointNamesOf<C> = C extends { breakpoints: Breakpoints<infer B> }
  ? keyof B & string
  : never

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

  /**
   * Ad-hoc condition atoms (`name/>=len`) used by stylesheets of this system —
   * registered at stylesheet creation, read by a css generator script so the
   * static system css carries a toggle for every condition actually in use.
   */
  usedConditions?: Set<string>

  /**
   * Condition builders, typed to THIS system's declared names — the
   * centralized home (`const { cq, bp } = mySystem`). The standalone exports
   * remain for generic tooling; combinators (`and`/`or`/`not`) are
   * name-agnostic and stay standalone.
   */
  cq: <N extends ContainerNamesOf<SystemConfig>>(
    name: N,
  ) => ContainerConditionBuilder<N>
  bp: <N extends BreakpointNamesOf<SystemConfig>>(name: N) => Condition<`@${N}`>

  /** Create a stylesheet with element definitions */
  stylesheet: StylesheetType<S>

  /** Create inline styles from token values */
  t: TFun<S>

  /**
   * Execute token style resolution.
   *
   * Accepts the CHAIN key forms as well as plain token names: `exec` is the
   * low-level resolver, and it reads `':<pseudo>_<token>'` and
   * `'@<breakpoint>_<token>'` (definers.ts, the `k[0] === ':'` and
   * `k[0] === '@'` branches). Those are admitted here rather than on
   * `TokenStyle` itself, which is instantiated per element of every
   * stylesheet: enumerating ~190 tokens against ~50 pseudo prefixes would be
   * 9,500 keys on the hottest type in the system.
   */
  exec: (
    config: {
      tokens: Tokens
      useClassName?: boolean
      /** Threaded into each token's `resolve` as `ctx.platform` (see ResolveContext). */
      platform?: import('./config.ts').Platform
    },
    tokenStyle: TokenStyle<S> & {
      [K in `:${string}_${string}` | `@${string}_${string}`]?: unknown
    },
  ) => { style: object; className?: string }
}
