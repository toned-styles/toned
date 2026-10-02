/**
 * Token system type definitions.
 *
 * @module types/system
 */
import type { SystemOptions } from '../system/definition.ts'
import type { QueryBuilder } from '../system/queries.ts'
import type { Config, Platform } from './config.ts'
import type {
  AuthoredElementStyle,
  StylesheetType,
  TFun,
  ValidateDeclaration,
} from './stylesheet.ts'
import type {
  AnyTokenConfig,
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
 *   id: 'app',
 *   tokens: {
 *     bgColor: defineToken({ ... }),
 *     padding: defineToken({ ... }),
 *   },
 * })
 * ```
 */
export type TokenSystem<
  S extends TokenStyleDeclaration,
  SystemConfig extends SystemOptions = SystemOptions,
> = {
  readonly id?: string
  readonly tokens: Readonly<
    Pick<
      S,
      {
        [K in keyof S]: S[K] extends AnyTokenConfig ? K : never
      }[keyof S]
    >
  >
  readonly themes?: Readonly<Record<string, Tokens>>

  /** Legacy combined token/config view; prefer tokens and config. */
  system: S

  /** Optional system configuration (breakpoints, etc.) */
  readonly config?: SystemConfig

  /**
   * Ad-hoc condition atoms (`name/>=len`) used by stylesheets of this system —
   * registered at stylesheet creation, read by a css generator script so the
   * static system css carries a toggle for every condition actually in use.
   */
  usedConditions?: Set<string>

  q: QueryBuilder<SystemConfig>

  /** Create a stylesheet with element definitions */
  stylesheet: StylesheetType<S>

  /** Pure immutable declaration helper: does not consult the renderer or theme. */
  style: <const T extends AuthoredElementStyle<S>>(
    declaration: T &
      ValidateDeclaration<T, AuthoredElementStyle<S>, S, never, true>,
  ) => Readonly<T>

  /** Create inline styles from token values */
  t: TFun<S>

  /**
   * Execute token style resolution.
   *
   * Accepts the CHAIN key forms as well as plain token names: `exec` is the
   * low-level resolver, and it reads `':<pseudo>_<token>'` and
   * `'@<breakpoint>_<token>'` (see `expand` in backends/css/execute.ts).
   * Those are admitted here rather than on
   * `TokenStyle` itself, which is instantiated per element of every
   * stylesheet: enumerating ~190 tokens against ~50 pseudo prefixes would be
   * 9,500 keys on the hottest type in the system.
   */
  exec: (
    config: ExecConfig,
    tokenStyle: TokenStyle<S> & {
      [K in `:${string}_${string}` | `@${string}_${string}`]?: unknown
    },
  ) => { style: object; className?: string }
}

/**
 * Declaration argument for system-agnostic engine code (plan compilation,
 * backends, hosts): `TokenSystem<AnyDeclaration>`. `TokenSystem<S>` is
 * invariant in `S` — its stylesheet, `style` and `t` take `S` in parameter
 * position — so a concrete system is not assignable to
 * `TokenSystem<TokenStyleDeclaration>`. It must stay a type argument (not a
 * `TokenSystem<any>` alias) so the checker keeps comparing by variance.
 */
// oxlint-disable-next-line typescript/no-explicit-any -- the only escape from TokenSystem's invariance in S
export type AnyDeclaration = any

export type ExecConfig = {
  /** Token values for style resolution */
  platform?: Platform
  tokens: Tokens

  /** Whether to emit class names for static token values */
  useClassName?: boolean
} & Partial<Pick<Config, 'mediaMode' | 'pseudoMode' | 'useMedia'>>
