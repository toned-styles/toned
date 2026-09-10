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
 * that leaves `process.env.NODE_ENV` for the consumer to substitute.
 *
 * Verified against `vite build`: an app build folds this whole expression to a
 * constant, so the dev-only branches it guards are dropped. The two obvious
 * alternatives are both worse. A bare `process.env.NODE_ENV` is substituted
 * too, but throws a ReferenceError in a library build. Adding a
 * `typeof process !== 'undefined'` guard defeats the substitution and leaves a
 * runtime check that is false in every browser, so warnings would ship *and*
 * fire in production.
 *
 * A bundler that substitutes neither simply leaves the runtime read, which
 * evaluates false and keeps the warnings on — noisy, never broken.
 */
export const IS_PRODUCTION = globalThis.process?.env?.NODE_ENV === 'production'
