/**
 * Token-related type definitions.
 *
 * @module types/tokens
 */

/**
 * Token values object - maps token names to their resolved values.
 * Used by resolve functions to access the design token values.
 *
 * @example
 * ```ts
 * const tokens: Tokens = {
 *   colors: { primary: '#007bff', secondary: '#6c757d' },
 *   spacing: { sm: 4, md: 8, lg: 16 }
 * }
 * ```
 */
// biome-ignore lint/suspicious/noExplicitAny: tokens are dynamically typed based on user configuration
export type Tokens = Record<string, any>

/**
 * Token configuration - defines possible values and how to resolve them to styles.
 *
 * @template Values - Tuple of allowed values (use `as const` for literal types)
 * @template Result - The CSS properties object returned by resolve
 *
 * @example
 * ```ts
 * const bgColor: TokenConfig<['primary', 'secondary'], { backgroundColor: string }> = {
 *   values: ['primary', 'secondary'],
 *   resolve: (value, tokens) => ({ backgroundColor: tokens.colors[value] })
 * }
 * ```
 */
// biome-ignore lint/suspicious/noExplicitAny: const generic requires any[] for tuple inference
export type TokenConfig<Values extends readonly any[], Result> = {
  values: Values
  resolve: (value: Values[number], tokens: Tokens) => Result
  /**
   * CSS properties in `resolve`'s result that carry this token's colour.
   * Declaring it enables the alpha modifier — `bgColor: 'primary/90'` — see
   * `utils/alpha.ts` for the whole mechanism.
   */
  alphaChannel?: readonly string[]
  /** Alpha percentages that get a static atomic class (default: 5…95 by 5).
   * Off-scale values still work via an inline parameter custom property. */
  alphaSteps?: readonly number[]
}

/** The extra shape `defineToken` preserves so `TokenStyle` can widen values. */
export type TokenAlphaConfig = {
  alphaChannel?: readonly string[]
  alphaSteps?: readonly number[]
}

/**
 * Breakpoints configuration wrapper.
 * Use `__breakpoints` to define responsive breakpoints.
 *
 * @example
 * ```ts
 * const breakpoints: Breakpoints<{ sm: 640, md: 768, lg: 1024 }> = {
 *   __breakpoints: { sm: 640, md: 768, lg: 1024 }
 * }
 * ```
 */
export type Breakpoints<O extends Record<string, number>> = { __breakpoints: O }

/**
 * Token style declaration - the complete system definition.
 * Maps token names to their configurations, with optional breakpoints.
 */
/**
 * One animation's keyframes: step ('from' | 'to' | '50%') to raw CSS
 * properties. Raw on purpose — keyframes are enumerated, system-compiled
 * artifacts (like the tokens), and a var() reference in a value still resolves
 * against the token custom properties at play time.
 */
export type AnimationKeyframes = Record<string, Record<string, string | number>>

export type TokenStyleDeclaration = {
  // biome-ignore lint/suspicious/noExplicitAny: index signature must accept all TokenConfig variants
  [key: string]: TokenConfig<any, any> | Breakpoints<any> | Record<string, AnimationKeyframes> | undefined
  // biome-ignore lint/suspicious/noExplicitAny: breakpoints use generic parameter
  breakpoints?: Breakpoints<any>
  /** Named animations compiled with the system css — see `defineAnimations`. */
  animations?: Record<string, AnimationKeyframes>
}

/** Filter out 'breakpoints' key from token style keys */
export type TokenKeys<S> = Exclude<keyof S, 'breakpoints'>

/** Inline style object - allows any CSS properties */
// biome-ignore lint/suspicious/noExplicitAny: CSS properties are dynamic
export type InlineStyle = any

/**
 * Style object for a token system - maps token names to their allowed values.
 *
 * @template S - The token style declaration
 *
 * @example
 * ```ts
 * // For a system with bgColor and padding tokens:
 * const style: TokenStyle<typeof system> = {
 *   bgColor: 'primary',
 *   padding: 2,
 *   style: { opacity: 0.5 } // inline styles
 * }
 * ```
 */
export type TokenStyle<S extends TokenStyleDeclaration> = Partial<{
  // `Extract` first, because on the OPEN system (`S` = TokenStyleDeclaration
  // itself) `S[key]` is the union `TokenConfig | Breakpoints | undefined`, which
  // does not extend `TokenConfig<infer V, unknown>`. Without the Extract that
  // branch yields `never`, so TokenStyle<TokenStyleDeclaration> collapses to
  // `Partial<{ [x: string]: never }>` — every style object becomes a type error,
  // and TokenSystem<Concrete> stops being assignable to TokenSystem<open>.
  // Extracting the TokenConfig member keeps the open system permissive while
  // leaving concrete systems exactly as strict as before.
  [key in TokenKeys<S>]: Extract<
    S[key],
    // biome-ignore lint/suspicious/noExplicitAny: matching all TokenConfig variants
    TokenConfig<any, unknown>
  > extends TokenConfig<infer V, unknown>
    ? // A token that declared an alphaChannel also accepts `'value/alpha'`.
      // The presence test is on a REQUIRED alphaChannel, so the open system
      // (where the field is merely optional) stays exactly as strict as before.
      Extract<S[key], { alphaChannel: readonly string[] }> extends never
      ? V[number]
      : V[number] | `${V[number] & string}/${number}`
    : never
}> & { style?: InlineStyle }
