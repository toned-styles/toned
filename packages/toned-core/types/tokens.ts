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
export type TokenStyleDeclaration = {
  // biome-ignore lint/suspicious/noExplicitAny: index signature must accept all TokenConfig variants
  [key: string]: TokenConfig<any, any> | Breakpoints<any> | undefined
  // biome-ignore lint/suspicious/noExplicitAny: breakpoints use generic parameter
  breakpoints?: Breakpoints<any>
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
  [key in TokenKeys<S>]: S[key] extends TokenConfig<infer V, unknown>
    ? V[number]
    : never
}> & { style?: InlineStyle }
