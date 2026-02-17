/**
 * Symbol definitions for the toned styling system.
 * Uses Symbol.for() for cross-realm compatibility.
 *
 * Each symbol has a declared unique symbol type so that TypeScript treats
 * symbol-keyed properties as distinct from string properties. This prevents
 * `keyof Stylesheet<S,T,M>` from collapsing into `string` and preserves
 * specific element key types through `UseStylesResult<T>`.
 *
 * @module utils/symbols
 */

// Type-level unique symbol declarations
declare const _symRef: unique symbol
declare const _symInit: unique symbol
declare const _symVariants: unique symbol
declare const _symStyle: unique symbol
declare const _symAccess: unique symbol

/** Symbol used to reference the parent TokenSystem from styled objects */
// biome-ignore lint/suspicious/noExplicitAny: bridging Symbol.for() to unique symbol type
export const SYMBOL_REF: typeof _symRef = Symbol.for(
	'@toned/core/SYMBOL_REF',
) as any

/** Symbol used for lazy stylesheet initialization */
// biome-ignore lint/suspicious/noExplicitAny: bridging Symbol.for() to unique symbol type
export const SYMBOL_INIT: typeof _symInit = Symbol.for(
	'@toned/core/SYMBOL_INIT',
) as any

/** Symbol used to store variant definitions */
// biome-ignore lint/suspicious/noExplicitAny: bridging Symbol.for() to unique symbol type
export const SYMBOL_VARIANTS: typeof _symVariants = Symbol.for(
	'@toned/core/SYMBOL_VARIANTS',
) as any

/** Symbol used to store style values in t() results */
// biome-ignore lint/suspicious/noExplicitAny: bridging Symbol.for() to unique symbol type
export const SYMBOL_STYLE: typeof _symStyle = Symbol.for(
	'@toned/core/SYMBOL_STYLE',
) as any

/** Symbol used for accessing ref and value from styled objects */
// biome-ignore lint/suspicious/noExplicitAny: bridging Symbol.for() to unique symbol type
export const SYMBOL_ACCESS: typeof _symAccess = Symbol.for(
	'@toned/core/SYMBOL_ACCESS',
) as any
