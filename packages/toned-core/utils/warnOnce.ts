/**
 * Deduplicated development warnings.
 *
 * @module utils/warnOnce
 */

import { IS_PRODUCTION } from './env.ts'

const warned = new Set<string>()

/**
 * Log `message` the first time it is seen, then stay quiet.
 *
 * Style resolution runs on every render, so an un-deduplicated warning would
 * flood the console. The message itself is the key: two systems reporting the
 * same kind of problem word their messages differently — each names its own
 * breakpoints or tokens — so both are heard, while one system repeating the
 * same problem is heard once.
 *
 * Pass a thunk whenever the message interpolates anything. The production check
 * happens before it is called, so the string is never assembled in a build that
 * would not print it — which matters because the callers sit on the render
 * path and warn about the *default* config, not an exotic one. A plain string
 * is fine for a fixed message: a literal costs nothing to pass.
 *
 * Silent in production builds.
 */
export function warnOnce(message: string | (() => string)) {
  if (IS_PRODUCTION) return

  const text = typeof message === 'string' ? message : message()
  if (warned.has(text)) return

  warned.add(text)
  console.warn(`[toned] ${text}`)
}

/** @internal Clear the dedupe state. Test-only. */
export function __resetWarnings() {
  warned.clear()
}
