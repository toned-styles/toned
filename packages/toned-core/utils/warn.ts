/**
 * Dev-only, once-per-key warnings.
 *
 * toned's worst failure modes are silent — a missing platform config renders
 * unstyled elements, `useMedia: false` drops every breakpoint style — so the
 * library says so, once, in development. Production builds strip to a no-op.
 *
 * @module utils/warn
 */

const warned = new Set<string>()

declare const process: { env?: Record<string, string | undefined> } | undefined

const isDev = (): boolean => {
  try {
    return typeof process !== 'undefined' && process?.env?.['NODE_ENV'] !== 'production'
  } catch {
    return true
  }
}

export function warnOnce(key: string, message: string) {
  if (!isDev() || warned.has(key)) return
  warned.add(key)
  // biome-ignore lint/suspicious/noConsole: the whole point
  console.warn(`[toned] ${message}`)
}

/** Test hook: forget previous warnings so a suite can assert each one. */
export function resetWarnings() {
  warned.clear()
}
