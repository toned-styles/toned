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
  /** Resolved inline styles */
  readonly style: Record<string, unknown>
  /** Generated class name string */
  readonly className: string | undefined
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
  [K in keyof T]: K extends
    | `${string}:${string}`
    | `[${string}]`
    | `@${string}`
    | 'prototype'
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
} & {
  [B in keyof InferBreakpoints<S> as `@${B & string}`]?: ElementMap<S, Elements>
}

// =============================================================================
// Variant Selector Types
// =============================================================================

import type {
  ExtractNamedStyles,
  NamedStyleKey,
  VariantKey,
  VariantSelector,
} from '../stylesheet/variantSelector.ts'

export type { VariantSelector, VariantKey, NamedStyleKey, ExtractNamedStyles }

/**
 * A single selector segment for a key-value pair.
 * For booleans: generates [key], [key=true], [key=false]
 * For strings/numbers: generates [key=value]
 */
type SingleSelector<K extends string, V> = V extends boolean
  ? `[${K}]` | `[${K}=true]` | `[${K}=false]`
  : V extends string | number
    ? `[${K}=${V}]`
    : never

/**
 * Union of all valid single selectors for a Mods type.
 */
type AllSingleSelectors<Mods extends ModType> = {
  [K in keyof Mods]: K extends string
    ? SingleSelector<K, Exclude<Mods[K], undefined>>
    : never
}[keyof Mods]

/**
 * All valid 2-segment selectors (all permutations).
 */
type TwoSegmentSelector<Mods extends ModType> = {
  [K1 in keyof Mods]: K1 extends string
    ? {
        [K2 in Exclude<keyof Mods, K1>]: K2 extends string
          ? `${SingleSelector<K1, Exclude<Mods[K1], undefined>>}${SingleSelector<K2, Exclude<Mods[K2], undefined>>}`
          : never
      }[Exclude<keyof Mods, K1>]
    : never
}[keyof Mods]

/**
 * All valid 3-segment selectors (all permutations).
 */
type ThreeSegmentSelector<Mods extends ModType> = {
  [K1 in keyof Mods]: K1 extends string
    ? {
        [K2 in Exclude<keyof Mods, K1>]: K2 extends string
          ? {
              [K3 in Exclude<keyof Mods, K1 | K2>]: K3 extends string
                ? `${SingleSelector<K1, Exclude<Mods[K1], undefined>>}${SingleSelector<K2, Exclude<Mods[K2], undefined>>}${SingleSelector<K3, Exclude<Mods[K3], undefined>>}`
                : never
            }[Exclude<keyof Mods, K1 | K2>]
          : never
      }[Exclude<keyof Mods, K1>]
    : never
}[keyof Mods]

/**
 * Union of all valid variant selectors (1, 2, or 3 segments).
 */
type AllVariantSelectors<Mods extends ModType> =
  | AllSingleSelectors<Mods>
  | TwoSegmentSelector<Mods>
  | ThreeSegmentSelector<Mods>

/**
 * Legacy variants input - maps variant selectors to element styles.
 * @deprecated Use callback-based variants API instead
 */
export type VariantsInput<
  S extends TokenStyleDeclaration,
  Elements extends string,
  Mods extends ModType,
> = {
  [K in AllVariantSelectors<Mods>]?: ElementMap<S, Elements>
}

// =============================================================================
// New Callback-based Variants API
// =============================================================================

/**
 * Style definition for an element within a variant, with compose support
 */
export type VariantElementStyle<
  S extends TokenStyleDeclaration,
  Elements extends string,
> = TokenStyle<S> & {
  /** Compose styles from other elements */
  $compose?: Elements | Elements[]
}

/**
 * Named style definition - can only contain element styles
 */
export type NamedStyleDef<
  S extends TokenStyleDeclaration,
  Elements extends string,
> = {
  [E in Elements]?: TokenStyle<S>
}

/**
 * Variant style definition - can compose named styles and define element styles
 */
export type VariantStyleDef<
  S extends TokenStyleDeclaration,
  Elements extends string,
  Named extends string,
> = {
  /** Compose styles from named style definitions */
  $compose?: Named | Named[]
} & {
  [E in Elements]?: VariantElementStyle<S, Elements>
}

/**
 * Infer the result type of a variants callback
 */
export type VariantsCallbackResult<
  S extends TokenStyleDeclaration,
  Elements extends string,
  R,
> = {
  [K in keyof R]: K extends NamedStyleKey<string>
    ? NamedStyleDef<S, Elements>
    : VariantStyleDef<S, Elements, ExtractNamedStyles<R>>
}

/**
 * Callback function type for the new variants API
 */
export type VariantsCallback<
  S extends TokenStyleDeclaration,
  Elements extends string,
  Mods extends ModType,
> = (
  $: VariantSelector<Mods>,
) => Record<
  string,
  NamedStyleDef<S, Elements> | VariantStyleDef<S, Elements, string>
>

/**
 * Stylesheet with variants() method for adding conditional styles.
 */
export type StylesheetWithVariants<
  S extends TokenStyleDeclaration,
  Elements extends string,
> = {
  /**
   * Define variants using a callback with type-safe selector proxy
   *
   * @example
   * ```ts
   * stylesheet.variants<{ size: 'm' | 's'; variant: 'accent' | 'danger' }>(($) => ({
   *   [$("base_style")]: {
   *     container: { padding: 2 },
   *   },
   *   [$.size("m")]: {
   *     $compose: "base_style",
   *     container: { paddingX: 4 },
   *   },
   *   [$.size("m").variant("accent")]: {
   *     container: { bgColor: "action" },
   *   },
   * }))
   * ```
   */
  variants<Mods extends ModType>(
    callback: VariantsCallback<S, Elements, Mods>,
  ): Stylesheet<S, Record<Elements, TokenStyle<S>>, Mods>

  /**
   * Define variants using an object (legacy API)
   * @deprecated Use callback-based API for better type safety
   */
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
  { [K in PickString<ExtractElements<T>>]: TokenStyle<S> },
  PickString<ExtractElements<T>>
>

// Forward reference for TokenSystem (defined in system.ts)
import type { TokenSystem } from './system.ts'
