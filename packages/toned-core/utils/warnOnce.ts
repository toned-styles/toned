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
 * Pass a thunk whenever the message interpolates anything. It is skipped
 * wherever {@link IS_PRODUCTION} resolves true — SSR, and any bundler that
 * substitutes `process.env.NODE_ENV` — and costs nothing where it does not.
 * Note that the thunk still runs on each call in a browser bundle, since the
 * text is the dedupe key; it defers the build, it does not eliminate it.
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
