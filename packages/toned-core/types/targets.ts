/**
 * The render targets a system declares (`defineSystem({ targets })`), and
 * what they make of a part's style type.
 *
 * A part's `$style` is typed as what EVERY declared target supports: a
 * web-only system writes plain CSS, `['web', 'email']` the inline-safe subset,
 * and a system with a static target (email, PDF) has no conditions. Without
 * `targets` nothing here applies, and `$style` is the portable style (the
 * same as `['web', 'native']`).
 *
 * @module types/targets
 */
import type { Properties } from 'csstype'

import type { Platform } from './config.ts'
import type { QuoteList, TonedError } from './errors.ts'
import type { PlatformStyle } from './style.ts'
import type { ElementType } from './tokens.ts'

/** A renderer a system can declare it is rendered by. */
export type Target = 'web' | 'native' | 'email' | 'pdf' | 'tailwind'

/** The runtime list `targets` is checked against. */
export const TARGETS_LIST: readonly Target[] = Object.freeze([
  'web',
  'native',
  'email',
  'pdf',
  'tailwind',
])

/** Type-only key carrying a system's declared targets; never at runtime. */
export declare const TARGETS: unique symbol

/** A system's declared targets, as a type-only marker. A named alias, so a
 *  declaration file names it rather than the unexported symbol (TS4023). */
export type Targeted<T extends Target> = { readonly [TARGETS]: T }

/** The marker `defineSystem` adds to a system that declares `targets`. */
export type SystemTargets<T extends readonly Target[]> = [T] extends [never]
  ? {}
  : Targeted<T[number]>

/** The targets a system declared; `never` when it declared none. */
export type TargetsOf<S> = S extends { readonly [TARGETS]: infer T }
  ? T & Target
  : never

/** Which `'@platform …'` block each target reads. */
type PlatformTargets = {
  web: 'web' | 'email' | 'tailwind'
  native: 'native' | 'pdf'
}

/** Targets that render one static style per part: no conditions, no CSS. */
export type StaticTarget = 'email' | 'pdf'

/** The declared targets that are static, or `never`. */
export type StaticTargetsOf<S> = Extract<TargetsOf<S>, StaticTarget>

type TextKeys =
  | 'color'
  | 'fontFamily'
  | 'fontSize'
  | 'fontStyle'
  | 'fontWeight'
  | 'letterSpacing'
  | 'lineHeight'
  | 'textAlign'
  | 'textDecorationLine'
  | 'textTransform'

/** Web CSS that an inline `style` attribute carries: no CSS variables. */
export type InlineSafeStyle<Kind> = (Kind extends 'text' | undefined
  ? Properties<number | string>
  : Omit<Properties<number | string>, TextKeys> & {
      [K in TextKeys]?: never
    }) & {
  [
    K in `--${string}`
  ]?: TonedError<'CSS variables have no value in email: this system declares an email target, which renders literal inline styles'>
}

/** The style every target in `T` supports, for an element kind. */
type CommonStyle<Kind extends ElementType | undefined, T extends Target> = [
  T,
] extends [PlatformTargets['web']]
  ? [T] extends ['web' | 'tailwind']
    ? PlatformStyle<Kind, 'web'>
    : InlineSafeStyle<Kind>
  : [T] extends ['native']
    ? PlatformStyle<Kind, 'native'>
    : // Web and native (or PDF) together: the portable intersection.
      PlatformStyle<Kind, undefined>

/**
 * A part's `$style` type in system `S`, inside a `Host` platform block (or
 * outside any when `Host` is undefined). Without declared targets this is
 * exactly `PlatformStyle<Kind, Host>`.
 */
export type StyleOf<
  S,
  Kind extends ElementType | undefined,
  Host extends Platform | undefined,
> = [TargetsOf<S>] extends [never]
  ? PlatformStyle<Kind, Host>
  : Host extends Platform
    ? [Extract<TargetsOf<S>, PlatformTargets[Host]>] extends [never]
      ? // A block for a platform no declared target reads never applies.
        PlatformStyle<Kind, Host>
      : CommonStyle<Kind, Extract<TargetsOf<S>, PlatformTargets[Host]>>
    : CommonStyle<Kind, TargetsOf<S>>

/** A skipped `$style` list entry, as `cond && fragment` produces. */
type Falsy = false | null | undefined

/**
 * One `$style` list entry: a style, or an object of `null`s that unsets what
 * earlier entries set (`[base, { zIndex: null }]`). A style and its unsets
 * are separate entries: typing every property as `T[K] | null` (or mapping
 * the style's keys to `null`) makes the renderer's `t` too complex for the
 * checker to represent (TS2590). The validation walk still checks an unset's
 * keys against the style's, so a misspelt one is reported.
 */
export type StyleListEntry<T> = T | { readonly [property: string]: null }

/**
 * What `$style` accepts: one style object, or a list merged in order (the
 * last wins; falsy entries are skipped; `null` unsets a property).
 */
export type StyleValue<T> = T | readonly (StyleListEntry<T> | Falsy)[]

/** The object a `$style` value holds, without the list form. */
export type StyleObjectOf<V> = Exclude<NonNullable<V>, readonly unknown[]>

/** The entry type of a `$style` list. */
export type StyleEntryOf<V> = Exclude<
  Extract<NonNullable<V>, readonly unknown[]>[number],
  Falsy
>

/** Whether system `S` allows CSS extensions (`$webRules`, `$grid`, `$area`). */
export type AllowsCssExtensions<S> = [Extract<TargetsOf<S>, 'email'>] extends [
  never,
]
  ? true
  : false

/** The error a CSS extension key gets in a system with an email target. */
export type CssExtensionError<K extends string> =
  TonedError<`'${K}' needs a browser stylesheet, and this system declares an email target, which renders inline styles only: drop '${K}' or the email target`>

/** Condition keys: states, media, containers, expressions, cross-part keys. */
type IsConditionKey<K> = K extends `@platform${string}`
  ? false
  : K extends
        | `:${string}`
        | `@${string}`
        | `${string}:${string}`
        | `${string}~${string}`
    ? true
    : false

/**
 * In a system with a static target, every condition key written in `Input`
 * maps to an error naming the static targets; otherwise nothing. Intersected
 * with a declaration's validation.
 */
export type StaticConditionCheck<Input, S> = [StaticTargetsOf<S>] extends [
  never,
]
  ? {}
  : {
      [
        K in keyof Input as IsConditionKey<K> extends true ? K : never
      ]: TonedError<`'${K & string}' is a condition, and this system's ${QuoteList<StaticTargetsOf<S>>} target renders one static style per part: use a variant ([$.<axis>(value)]) instead, or drop the static target`>
    }

/**
 * Both platform spellings in one object: the alias maps to an error naming
 * the canonical key, since one block would replace the other.
 */
export type PlatformAliasCheck<Input> = [
  Extract<keyof Input, `@platform.${string}`>,
] extends [never]
  ? {}
  : {
      [
        K in keyof Input as K extends `@platform.${infer P}`
          ? `@platform ${P}` extends keyof Input
            ? K
            : never
          : never
      ]: K extends `@platform.${infer P}`
        ? TonedError<`'@platform ${P}' and its deprecated alias '${K}' are both written here, and one block would replace the other: merge them into one '@platform ${P}' block`>
        : never
    }
