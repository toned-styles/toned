import { sym } from './utils.ts'

export const SYMBOL_REF = sym('SYMBOL_REF')
export const SYMBOL_INIT = sym('SYMBOL_INIT')
export const SYMBOL_VARIANTS = sym('SYMBOL_VARIANTS')

// biome-ignore lint/suspicious/noExplicitAny: tokens store dynamically typed values
export type Tokens = Record<string, any>

// biome-ignore lint/suspicious/noExplicitAny: ignore
export type TokenConfig<Values extends readonly any[], Result> = {
  values: Values
  resolve: (value: Values[number], tokens: Tokens) => Result
}

export type Breakpoints<O extends Record<string, number>> = { __breakpoints: O }

type InferBreakpoints<R> = R extends { breakpoints?: Breakpoints<infer X> }
  ? X
  : never

/**
 * Token style declaration - a record of token names to their configs.
 * The breakpoints property is handled separately as it's not a TokenConfig.
 */
export type TokenStyleDeclaration = {
  // biome-ignore lint/suspicious/noExplicitAny: dynamic token config types
  [key: string]: TokenConfig<any, any> | Breakpoints<any> | undefined
  // biome-ignore lint/suspicious/noExplicitAny: breakpoint type uses generic parameter
  breakpoints?: Breakpoints<any>
}

// biome-ignore lint/suspicious/noExplicitAny: ignore
type InlineStyle = any

// Helper to filter out breakpoints key from token style
type TokenKeys<S> = Exclude<keyof S, 'breakpoints'>

export type TokenStyle<S extends TokenStyleDeclaration> = Partial<{
  [key in TokenKeys<S>]: S[key] extends TokenConfig<infer V, unknown>
    ? V[number]
    : never
}> & { style?: InlineStyle }

// biome-ignore lint/suspicious/noExplicitAny: ignore
type Merge<D extends any[]> = D extends [infer First, ...infer Rest]
  ? First & Merge<Rest>
  : []

export type TFun<S extends TokenStyleDeclaration> = <D extends TokenStyle<S>[]>(
  ...values: [...D]
) => Merge<D> & {
  /* @internal */
  [SYMBOL_REF]: TokenSystem<S>
}

export type ModType = Record<string, string | boolean | number>

export type Config = Readonly<{
  getTokens: () => Tokens

  useClassName: boolean
  useMedia: boolean
  debug: boolean

  // TODO
  // biome-ignore lint/suspicious/noExplicitAny lint/complexity/noBannedTypes: dynamic context and return type
  getProps(this: any, elementKey: string): {}

  initRef: () => void
  initInteraction: () => void
}>

declare const _internalBrand: unique symbol

export type Pseudo = ':hover' | ':active' | ':focus'

export type PickString<K> = K extends string ? K : never

type StringOrNumber = string | number | symbol

// =============================================================================
// NEW API TYPES
// =============================================================================

/**
 * Element style with inline pseudo classes and breakpoints (self only)
 * Example: { bgColor: 'red', ':hover': { bgColor: 'blue' }, '@sm': { padding: 4 } }
 */
export type ElementStyleNew<
  S extends TokenStyleDeclaration,
  AvailablePseudo extends string = Pseudo,
  AvailableBreakpoints extends StringOrNumber = keyof InferBreakpoints<S>,
> = TokenStyle<S> & {
  $$type?: 'view' | 'text' | 'image'
} & {
  // Pseudo classes (self only)
  [P in AvailablePseudo]?: TokenStyle<S>
} & {
  // Breakpoints (self only)
  [B in AvailableBreakpoints as `@${B & string}`]?: TokenStyle<S>
}

/**
 * Extract element names from stylesheet input (excluding selectors)
 */
type ExtractElements<T> = {
  [K in keyof T]: K extends `${string}:${string}` | `[${string}]` | 'prototype'
    ? never
    : K
}[keyof T]

/**
 * Element map for cross-element or variant selectors
 * Example: { container: { bgColor: 'red' }, label: { color: 'white' } }
 */
export type ElementMap<
  S extends TokenStyleDeclaration,
  Elements extends string,
> = {
  [E in Elements]?: TokenStyle<S>
}

/**
 * Cross-element selector type (e.g., 'container:hover')
 * Multiple pseudo classes must be in alphabetical order
 */
type CrossElementSelector<Elements extends string> =
  | `${Elements}:active`
  | `${Elements}:active:focus`
  | `${Elements}:active:focus:hover`
  | `${Elements}:active:hover`
  | `${Elements}:focus`
  | `${Elements}:focus:hover`
  | `${Elements}:hover`

/**
 * Main stylesheet input type (base styles, no variants)
 */
export type StylesheetInput<
  S extends TokenStyleDeclaration,
  T,
  Elements extends string = PickString<ExtractElements<T>>,
> = {
  // Element definitions
  [K in Elements]?: ElementStyleNew<S>
} & {
  // Cross-element selectors like 'container:hover'
  [K in CrossElementSelector<Elements>]?: ElementMap<S, Elements>
}

/**
 * Single variant selector (e.g., '[size=sm]')
 */
type SingleVariantSelector<Mods extends ModType> = {
  [K in keyof Mods]: `[${K & string}=${Exclude<Mods[K], undefined> & string}]`
}[keyof Mods]

/**
 * Combined variant selector (e.g., '[size=sm][variant=accent]')
 * Note: The implementation will validate alphabetical order
 */
type VariantSelector<Mods extends ModType> = SingleVariantSelector<Mods>

/**
 * Variants input type
 */
export type VariantsInput<
  S extends TokenStyleDeclaration,
  Elements extends string,
  Mods extends ModType,
> = {
  [K in VariantSelector<Mods>]?: ElementMap<S, Elements>
} & {
  // Allow combined selectors (TypeScript can't easily generate all combinations)
  [key: `[${string}]`]: ElementMap<S, Elements> | undefined
}

/**
 * Stylesheet with variants method
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
 * Final stylesheet type
 */
export type Stylesheet<
  S extends TokenStyleDeclaration,
  T extends Record<string, TokenStyle<S>>,
  M extends ModType = never,
> = {
  [key in keyof T]: ReturnType<TFun<S>>
} & {
  /* @internal */
  [SYMBOL_REF]: TokenSystem<S>
  /* @internal */
  [SYMBOL_INIT]: (
    config: Config,
    modState?: M,
  ) => {
    [key in keyof T]: ReturnType<TFun<S>>
  }
  // keep it in the shape so it won't collapse to {} after build
  [_internalBrand]?: never
}

/**
 * Pre-variants stylesheet type (returned from stylesheet() before .variants())
 */
export type PreVariantsStylesheet<
  S extends TokenStyleDeclaration,
  T extends Record<string, TokenStyle<S>>,
  Elements extends string,
> = Stylesheet<S, T, never> & StylesheetWithVariants<S, Elements>

/**
 * Stylesheet function type
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

export type TokenSystem<
  S extends TokenStyleDeclaration,
  // biome-ignore lint/suspicious/noExplicitAny: breakpoint config uses generic parameter
  Config extends { breakpoints?: Breakpoints<any> } = {
    // biome-ignore lint/suspicious/noExplicitAny: breakpoint config uses generic parameter
    breakpoints?: Breakpoints<any>
  },
> = {
  system: S
  config?: Config
  stylesheet: StylesheetType<S>
  t: TFun<S>
  exec: (
    config: {
      tokens: Tokens
      useClassName?: boolean
    },
    tokenStyle: TokenStyle<S>,
  ) => { style: object; className?: string }
}

// =============================================================================
// LEGACY TYPES (kept for backwards compatibility during migration)
// =============================================================================

export const SYMBOL_STATE = sym('SYMBOL_STATE')

export class C_<_T> {
  // static myStatic: T;
}

export interface Ctor {
  /* @internal */
  [SYMBOL_STATE]: this extends typeof C_<infer T> ? T : never
}

// biome-ignore lint/suspicious/noExplicitAny: ignore
export const C: typeof C_ & Ctor = C_ as any

export type ElementStyle<
  S extends TokenStyleDeclaration,
  Elements extends string,
  Mods extends ModType,
  AvailablePseudo extends string,
  AvailableBreakpoints extends StringOrNumber,
> = TokenStyle<S> & {
  [PseudoKey in AvailablePseudo]?: ElementStyle<
    S,
    NoInfer<Elements>,
    Mods,
    NoInfer<Exclude<AvailablePseudo, PseudoKey>>,
    AvailableBreakpoints
  > &
    ElementList<
      S,
      NoInfer<Elements>,
      Mods,
      NoInfer<AvailablePseudo>,
      AvailableBreakpoints
    >
} & {
  [K in keyof Mods as `[${PickString<K>}=${Exclude<Mods[K], undefined>}]`]?: ElementStyle<
    S,
    NoInfer<Elements>,
    Omit<Mods, NoInfer<K>>,
    NoInfer<AvailablePseudo>,
    AvailableBreakpoints
  >
} & {
  [K in AvailableBreakpoints]?: ElementStyle<
    S,
    NoInfer<Elements>,
    Mods,
    NoInfer<AvailablePseudo>,
    NoInfer<Exclude<AvailableBreakpoints, K>>
  >
}

export type ElementList<
  S extends TokenStyleDeclaration,
  Elements extends string,
  Mods extends ModType,
  AvailablePseudo extends string,
  AvailableBreakpoints extends StringOrNumber,
> = {
  [ElementKey in `$${Elements}`]?: ElementStyle<
    S,
    Elements,
    Mods,
    AvailablePseudo,
    AvailableBreakpoints
  >
}

export type ModList<
  S extends TokenStyleDeclaration,
  Elements extends string,
  Mods extends ModType,
  AvailablePseudo extends string,
  AvailableBreakpoints extends StringOrNumber,
> = {
  [K in keyof Mods as `[${PickString<K>}=${Exclude<Mods[K], undefined>}]`]?: ElementList<
    S,
    Elements,
    Mods,
    AvailablePseudo,
    AvailableBreakpoints
  > &
    ModList<S, Elements, Omit<Mods, K>, AvailablePseudo, AvailableBreakpoints> &
    BreakpointsList<
      S,
      Elements,
      Omit<Mods, K>,
      AvailablePseudo,
      AvailableBreakpoints
    >
}

export type BreakpointsList<
  S extends TokenStyleDeclaration,
  Elements extends string,
  Mods extends ModType,
  AvailablePseudo extends string,
  AvailableBreakpoints extends StringOrNumber,
> = {
  [K in AvailableBreakpoints]?: ElementList<
    S,
    Elements,
    Mods,
    AvailablePseudo,
    NoInfer<Exclude<AvailableBreakpoints, K>>
  >
}

export type StylesheetValue<
  S extends TokenStyleDeclaration,
  Mods extends ModType,
  T,
> = {
  [K in keyof T as K extends `[${string}]` | 'prototype' ? never : K]: {
    $$type?: 'view' | 'text' | 'image'
  } & ElementStyle<
    S,
    NoInfer<
      PickString<
        Exclude<
          keyof NoInfer<T>,
          /* NoInfer<K> | */ `[${string}]` | 'prototype'
        >
      >
    >,
    Mods,
    Pseudo,
    keyof InferBreakpoints<S>
  >
} & ModList<
  S,
  PickString<
    Exclude<keyof NoInfer<T>, /* NoInfer<K> | */ `[${string}]` | 'prototype'>
  >,
  Mods,
  Pseudo,
  keyof InferBreakpoints<S>
> &
  BreakpointsList<
    S,
    PickString<
      Exclude<keyof NoInfer<T>, /* NoInfer<K> | */ `[${string}]` | 'prototype'>
    >,
    Mods,
    Pseudo,
    keyof InferBreakpoints<S>
  >

export type StylesheetTypeLegacy<S extends TokenStyleDeclaration> = (<
  Mods extends ModType,
  T extends StylesheetValue<S, Mods, T>,
>(
  style: { [SYMBOL_STATE]?: Mods } & T,
) => Stylesheet<S, Omit<T, `[${string}]` | 'prototype'>, Mods>) & {
  state: typeof C
}
