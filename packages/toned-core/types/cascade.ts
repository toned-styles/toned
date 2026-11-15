/**
 * Compile-time checks for what a web condition cannot carry, applied to each
 * of a stylesheet's own parts:
 *
 * - a shorthand in one block beside one of its longhands in another
 *   (`transition` at rest, `transitionProperty` under `':open'`): outside its
 *   condition the conditional one reverts the other;
 * - a raw shorthand in `$style` beside a longhand a token writes in another
 *   block (the `animation` token's `animationName` beside a conditional
 *   `animation: 'none'`);
 * - a CSS-wide keyword (`inherit`, `initial`, `unset`, `revert`,
 *   `revert-layer`) under a condition, which cannot reach a property through
 *   the custom-property chain a condition compiles to.
 *
 * Each mistake becomes a required property named after the fix, so the error
 * reads "Property 'Toned: …' is missing". The runtime makes the same decisions
 * for sheets the types cannot see whole (core/shorthands.ts,
 * backends/css/plan.ts).
 */
import type { SHORTHANDS } from '../core/shorthands.ts'

type Table = typeof SHORTHANDS
type CssWideKeyword =
  | 'inherit'
  | 'initial'
  | 'unset'
  | 'revert'
  | 'revert-layer'
type PlatformKey =
  | '@platform web'
  | '@platform.web'
  | '@platform native'
  | '@platform.native'

type KeywordKeys<O> = {
  [K in keyof O & string]: O[K] extends CssWideKeyword ? K : never
}[keyof O & string]

/** Every raw style block of a part: its condition path (platform blocks are
 * not conditions), its keys and its keyword-valued keys. */
type StyleBlocks<
  P,
  Path extends string,
  Depth extends unknown[],
> = Depth['length'] extends 6
  ? never
  : {
      [K in keyof P & string]: K extends '$style' | 'style'
        ? P[K] extends object
          ? { path: Path; keys: keyof P[K] & string; kw: KeywordKeys<P[K]> }
          : never
        : K extends `$${string}`
          ? never
          : P[K] extends object
            ? P[K] extends readonly unknown[]
              ? never
              : StyleBlocks<
                  P[K],
                  K extends PlatformKey ? Path : `${Path}/${K}`,
                  [...Depth, 0]
                >
            : never
    }[keyof P & string]

/** The keys a result type always has. A loosely typed result (a whole
 * `CSSProperties`) has none, so it names no field. */
type RequiredFields<R> = {
  [K in keyof R & string]-?: {} extends Pick<R, K> ? never : K
}[keyof R & string]

/** The fields the tokens set in one block always write, from each token's
 * `resolve` result type (the `animation` token writes `animationName`). */
type TokenFields<P, S> = {
  [K in keyof P & keyof S & string]: S[K] extends {
    resolve: (...args: never[]) => infer R
  }
    ? WithLonghands<RequiredFields<R>>
    : never
}[keyof P & keyof S & string]

/** A field and, when it is a shorthand (`borderColor`), the longhands it
 * writes, so a token's shorthand meets a `$style` shorthand sharing one. */
type WithLonghands<F> =
  | F
  | (F extends keyof Table ? Table[F][number] & string : never)

/** Every block of a part that sets tokens: its condition path and the fields
 * those tokens write. Walked only for a part whose `$style` sets a shorthand. */
type TokenBlocks<
  P,
  Path extends string,
  Depth extends unknown[],
  S,
> = Depth['length'] extends 6
  ? never
  :
      | ([TokenFields<P, S>] extends [never]
          ? never
          : { path: Path; tokenFields: TokenFields<P, S> })
      | {
          [K in keyof P & string]: K extends `$${string}` | 'style'
            ? never
            : P[K] extends object
              ? P[K] extends readonly unknown[]
                ? never
                : TokenBlocks<
                    P[K],
                    K extends PlatformKey ? Path : `${Path}/${K}`,
                    [...Depth, 0],
                    S
                  >
              : never
        }[keyof P & string]

type UnionToIntersection<U> = (
  U extends unknown ? (value: U) => void : never
) extends (value: infer I) => void
  ? I
  : never
type IsUnion<U> = [U] extends [UnionToIntersection<U>] ? false : true

type PathsWith<B, Key> = B extends { path: infer Path; keys: infer Keys }
  ? [Extract<Keys, Key>] extends [never]
    ? never
    : Path
  : never
type KeysIn<B, Key> = B extends { keys: infer Keys }
  ? Extract<Keys, Key>
  : never

/** `shorthand|longhand` for each pair set in different blocks. */
type Conflicts<B> = {
  [S in keyof Table & string]: [PathsWith<B, S>] extends [never]
    ? never
    : [PathsWith<B, Table[S][number]>] extends [never]
      ? never
      : IsUnion<PathsWith<B, S> | PathsWith<B, Table[S][number]>> extends true
        ? `${S}|${KeysIn<B, Table[S][number]>}`
        : never
}[keyof Table & string]

/** The paths of token blocks writing one of `Key`'s longhands. A block whose
 * token writes the shorthand `S` itself sets the same property, whichever
 * wins, so it is no conflict. */
type TokenPathsWith<T, Key, S = never> = T extends {
  path: infer Path
  tokenFields: infer Fields
}
  ? [Extract<Fields, Key>] extends [never]
    ? never
    : [Extract<Fields, S>] extends [never]
      ? Path
      : never
  : never
type TokenFieldsIn<T, Key> = T extends { tokenFields: infer Fields }
  ? Extract<Fields, Key>
  : never

/** `shorthand|longhand` for a raw shorthand in a `$style` block (`B`) and a
 * longhand a token writes in a different block (`T`). The runtime cannot
 * always split the shorthand: `animation: none` reads as a keyframes name. */
type TokenConflicts<B, T> = {
  [S in KeysIn<B, keyof Table> & keyof Table]: [
    TokenPathsWith<T, Table[S][number], S>,
  ] extends [never]
    ? never
    : IsUnion<
          PathsWith<B, S> | TokenPathsWith<T, Table[S][number], S>
        > extends true
      ? `${S}|${TokenFieldsIn<T, Table[S][number]>}`
      : never
}[KeysIn<B, keyof Table> & keyof Table]

type ConditionalKeywords<B> = B extends { path: infer Path; kw: infer Keys }
  ? Path extends ''
    ? never
    : Keys
  : never

type ConflictMessage<C> = C extends `${infer S}|${infer L}`
  ? `Toned: '${S}' and its longhand '${L}' are set under different conditions; outside its condition the conditional one reverts the other. Write the longhands instead of '${S}', or set '${S}' in full in each condition`
  : never
type TokenConflictMessage<C> = C extends `${infer S}|${infer L}`
  ? `Toned: '${S}' in $style and the longhand '${L}' a token writes are set under different conditions; outside its condition the conditional one reverts the other. Write the longhand in $style instead of '${S}'${S extends 'animation' ? " (to stop an animation, write the animation token's animation: 'none')" : ''}`
  : never
type KeywordMessage<K> = K extends string
  ? `Toned: a CSS-wide keyword in '${K}' cannot apply under a condition; set the value it should take, or use $webRules: webRules({ '&:hover': { ${K}: … } })`
  : never

/** Token conflicts, walked only when a `$style` block sets a shorthand. */
type TokenCheck<P, S, B> = string extends keyof S
  ? unknown
  : [KeysIn<B, keyof Table>] extends [never]
    ? unknown
    : TokenConflicts<B, TokenBlocks<P, '', [], S>> extends infer C
      ? [C] extends [never]
        ? unknown
        : { [M in TokenConflictMessage<C>]: never }
      : unknown

/** `unknown` for a clean part; otherwise required properties naming each fix.
 * `S` is the system declaration, so the fields a token writes count. */
export type PartCascadeCheck<P, S = {}> =
  StyleBlocks<P, '', []> extends infer B
    ? [B] extends [never]
      ? unknown
      : ([Conflicts<B>] extends [never]
          ? unknown
          : { [M in ConflictMessage<Conflicts<B>>]: never }) &
          TokenCheck<P, S, B> &
          ([ConditionalKeywords<B>] extends [never]
            ? unknown
            : { [M in KeywordMessage<ConditionalKeywords<B>>]: never })
    : unknown
