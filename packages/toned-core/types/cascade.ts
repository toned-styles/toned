/**
 * Compile-time checks for what a web condition cannot carry, applied to each
 * of a stylesheet's own parts:
 *
 * - a shorthand in one block beside one of its longhands in another
 *   (`transition` at rest, `transitionProperty` under `':open'`): outside its
 *   condition the conditional one reverts the other;
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

type ConditionalKeywords<B> = B extends { path: infer Path; kw: infer Keys }
  ? Path extends ''
    ? never
    : Keys
  : never

type ConflictMessage<C> = C extends `${infer S}|${infer L}`
  ? `Toned: '${S}' and its longhand '${L}' are set under different conditions; outside its condition the conditional one reverts the other. Write the longhands instead of '${S}', or set '${S}' in full in each condition`
  : never
type KeywordMessage<K> = K extends string
  ? `Toned: a CSS-wide keyword in '${K}' cannot apply under a condition; set the value it should take, or use $webRules: webRules({ '&:hover': { ${K}: … } })`
  : never

/** `unknown` for a clean part; otherwise required properties naming each fix. */
export type PartCascadeCheck<P> =
  StyleBlocks<P, '', []> extends infer B
    ? [B] extends [never]
      ? unknown
      : ([Conflicts<B>] extends [never]
          ? unknown
          : { [M in ConflictMessage<Conflicts<B>>]: never }) &
          ([ConditionalKeywords<B>] extends [never]
            ? unknown
            : { [M in KeywordMessage<ConditionalKeywords<B>>]: never })
    : unknown
