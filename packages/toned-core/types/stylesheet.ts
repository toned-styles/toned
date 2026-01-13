/**
 * Stylesheet type definitions.
 *
 * @module types/stylesheet
 */

import type { SYMBOL_INIT, SYMBOL_REF } from '../utils/symbols.ts'
import type { Config } from './config.ts'
import type {
  Breakpoints,
  TokenStyle,
  TokenStyleDeclaration,
} from './tokens.ts'

/** Extract breakpoint keys from a system configuration */
type InferBreakpoints<R> = R extends { breakpoints?: Breakpoints<infer X> }
  ? X
  : never

/** String, number, or symbol (for object keys) */
type StringOrNumber = string | number | symbol

/** Variant modifier values - used for conditional styling */
export type ModType = Record<string, string | boolean | number>

/** Supported pseudo-class selectors */
export type Pseudo = ':hover' | ':active' | ':focus'

/** Extract string keys from a type */
export type PickString<K> = K extends string ? K : never

/** Brand symbol for internal type discrimination */
declare const _internalBrand: unique symbol

/** Merge tuple of objects into intersection type */
// biome-ignore lint/suspicious/noExplicitAny: tuple manipulation requires any[]
type Merge<D extends any[]> = D extends [infer First, ...infer Rest]
  ? First & Merge<Rest>
  : Record<string, never>

/**
 * The `t()` function type - creates styled objects from token values.
 *
 * @template S - The token style declaration
 *
 * @example
 * ```ts
 * const { t } = defineSystem({ bgColor, padding })
 * const style = t({ bgColor: 'primary', padding: 2 })
 * ```
 */
export type TFun<S extends TokenStyleDeclaration> = <D extends TokenStyle<S>[]>(
  ...values: [...D]
) => Merge<D> & {
  /** @internal */
  [SYMBOL_REF]: TokenSystem<S>
}

/**
 * Element style definition with support for pseudo-classes and breakpoints.
 *
 * @example
 * ```ts
 * const element: ElementStyleNew<System> = {
 *   bgColor: 'primary',
 *   ':hover': { bgColor: 'secondary' },
 *   '@sm': { padding: 4 }
 * }
 * ```
 */
export type ElementStyleNew<
  S extends TokenStyleDeclaration,
  AvailablePseudo extends string = Pseudo,
  AvailableBreakpoints extends StringOrNumber = keyof InferBreakpoints<S>,
> = TokenStyle<S> & {
  /** Element type hint for React Native */
  $$type?: 'view' | 'text' | 'image'
} & {
  [P in AvailablePseudo]?: TokenStyle<S>
} & {
  [B in AvailableBreakpoints as `@${B & string}`]?: TokenStyle<S>
}

/** Extract element names from stylesheet input (excluding selectors) */
type ExtractElements<T> = {
  [K in keyof T]: K extends `${string}:${string}` | `[${string}]` | 'prototype'
    ? never
    : K
}[keyof T]

/**
 * Map of element names to their styles.
 * Used in cross-element selectors and variants.
 */
export type ElementMap<
  S extends TokenStyleDeclaration,
  Elements extends string,
> = {
  [E in Elements]?: TokenStyle<S>
}

/** Cross-element pseudo selectors (e.g., 'container:hover') */
type CrossElementSelector<Elements extends string> =
  | `${Elements}:active`
  | `${Elements}:active:focus`
  | `${Elements}:active:focus:hover`
  | `${Elements}:active:hover`
  | `${Elements}:focus`
  | `${Elements}:focus:hover`
  | `${Elements}:hover`

/**
 * Stylesheet input type - defines elements and cross-element selectors.
 */
export type StylesheetInput<
  S extends TokenStyleDeclaration,
  T,
  Elements extends string = PickString<ExtractElements<T>>,
> = {
  [K in Elements]?: ElementStyleNew<S>
} & {
  [K in CrossElementSelector<Elements>]?: ElementMap<S, Elements>
}

/** Single variant selector (e.g., '[size=sm]') */
type SingleVariantSelector<Mods extends ModType> = {
  [K in keyof Mods]: `[${K & string}=${Exclude<Mods[K], undefined> & string}]`
}[keyof Mods]

/** Variant selector type */
type VariantSelector<Mods extends ModType> = SingleVariantSelector<Mods>

/**
 * Variants input - maps variant selectors to element styles.
 */
export type VariantsInput<
  S extends TokenStyleDeclaration,
  Elements extends string,
  Mods extends ModType,
> = {
  [K in VariantSelector<Mods>]?: ElementMap<S, Elements>
} & {
  // Allow combined selectors like '[size=sm][variant=accent]'
  [key: `[${string}]`]: ElementMap<S, Elements> | undefined
}

/**
 * Stylesheet with variants() method for adding conditional styles.
 */
export type StylesheetWithVariants<
  S extends TokenStyleDeclaration,
  Elements extends string,
> = {
  variants<Mods extends ModType>(
    variants: VariantsInput<S, Elements, Mods>,
  ): Stylesheet<S, Record<Elements, TokenStyle<S>>, Mods>
}

/**
 * Final stylesheet type - provides element accessors and variant support.
 */
export type Stylesheet<
  S extends TokenStyleDeclaration,
  T extends Record<string, TokenStyle<S>>,
  M extends ModType = never,
> = {
  [key in keyof T]: ReturnType<TFun<S>>
} & {
  /** @internal */
  [SYMBOL_REF]: TokenSystem<S>
  /** @internal */
  [SYMBOL_INIT]: (
    config: Config,
    modState?: M,
  ) => {
    [key in keyof T]: ReturnType<TFun<S>>
  }
  /** @internal - prevents type collapse */
  [_internalBrand]?: never
}

/**
 * Pre-variants stylesheet - returned from stylesheet() before .variants() is called.
 */
export type PreVariantsStylesheet<
  S extends TokenStyleDeclaration,
  T extends Record<string, TokenStyle<S>>,
  Elements extends string,
> = Stylesheet<S, T, never> & StylesheetWithVariants<S, Elements>

/**
 * Stylesheet factory function type.
 */
export type StylesheetType<S extends TokenStyleDeclaration> = <
  T extends StylesheetInput<S, T>,
>(
  style: T,
) => PreVariantsStylesheet<
  S,
  Record<PickString<ExtractElements<T>>, TokenStyle<S>>,
  PickString<ExtractElements<T>>
>

// Forward reference for TokenSystem (defined in system.ts)
import type { TokenSystem } from './system.ts'
