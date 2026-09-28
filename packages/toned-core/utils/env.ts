/**
 * Build environment detection.
 *
 * @module utils/env
 */

/**
 * True when the bundle was built for production.
 *
 * Reads through `globalThis` with optional chaining, which is safe wherever
 * `process` does not exist — an unbundled browser module, or a library build
 * that leaves `process.env.NODE_ENV` for the consumer to substitute. A bare
 * `process.env.NODE_ENV` would throw a ReferenceError in that second case.
 *
 * Bundlers do not fold this form: Vite's define plugin matches the literal
 * `process.env`, which `process?.env` is not, so it skips the module. The read
 * therefore survives into the bundle and evaluates false in a browser, where
 * `process` is undefined — meaning dev warnings still print in production.
 * Noisy, never broken, and the reason `warnOnce` takes a thunk.
 */
export const IS_PRODUCTION = globalThis.process?.env?.NODE_ENV === 'production'
