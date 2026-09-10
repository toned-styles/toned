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
 * Silent in production builds.
 */
export function warnOnce(message: string) {
  if (IS_PRODUCTION || warned.has(message)) return
  warned.add(message)
  console.warn(`[toned] ${message}`)
}

/** @internal Clear the dedupe state. Test-only. */
export function __resetWarnings() {
  warned.clear()
}
