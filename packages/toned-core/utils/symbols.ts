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
export declare const _symRef: unique symbol
export declare const _symInit: unique symbol
declare const _symVariants: unique symbol
declare const _symStyle: unique symbol
declare const _symAccess: unique symbol

/** Symbol used to reference the parent TokenSystem from styled objects */
export const SYMBOL_REF: typeof _symRef = Symbol.for(
  '@toned/core/SYMBOL_REF',
) as typeof _symRef

/** Symbol used for lazy stylesheet initialization */
export const SYMBOL_INIT: typeof _symInit = Symbol.for(
  '@toned/core/SYMBOL_INIT',
) as typeof _symInit

/** Symbol used to store variant definitions */
export const SYMBOL_VARIANTS: typeof _symVariants = Symbol.for(
  '@toned/core/SYMBOL_VARIANTS',
) as typeof _symVariants

/** Symbol used to store style values in t() results */
export const SYMBOL_STYLE: typeof _symStyle = Symbol.for(
  '@toned/core/SYMBOL_STYLE',
) as typeof _symStyle

/** Symbol used for accessing ref and value from styled objects */
export const SYMBOL_ACCESS: typeof _symAccess = Symbol.for(
  '@toned/core/SYMBOL_ACCESS',
) as typeof _symAccess

/** Immutable declared variant defaults, shared by mounted and pure resolution. */
export const SYMBOL_DEFAULTS = Symbol.for('@toned/core/SYMBOL_DEFAULTS')
