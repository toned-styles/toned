/**
 * Symbol definitions for the toned styling system.
 * Uses Symbol.for() for cross-realm compatibility.
 *
 * @module utils/symbols
 */

/**
 * Create a namespaced symbol for type portability.
 */
export const sym = <N extends string>(name: N) =>
  Symbol.for(`@toned/core/${name}`) as unknown as N

/** Symbol used to reference the parent TokenSystem from styled objects */
export const SYMBOL_REF = sym('SYMBOL_REF')

/** Symbol used for lazy stylesheet initialization */
export const SYMBOL_INIT = sym('SYMBOL_INIT')

/** Symbol used to store variant definitions */
export const SYMBOL_VARIANTS = sym('SYMBOL_VARIANTS')

/** Symbol used to store style values in t() results */
export const SYMBOL_STYLE = sym('SYMBOL_STYLE')

/** Symbol used for accessing ref and value from styled objects */
export const SYMBOL_ACCESS = sym('SYMBOL_ACCESS')
