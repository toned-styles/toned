import { createContext } from 'react'

/**
 * The context markers provided above this point of the tree, as the
 * `'@within …'` facts they answer (`{ '@within prose': true, '@within
 * prose=faq': true }`) — the NATIVE carrier of context markers.
 *
 * A part that declares `$context` provides its markers over the inherited
 * facts, replacing every fact of the same context, so the nearest provider
 * of a context answers (see PartHost). Every descendant sheet holding
 * `'@within …'` keys reads it (see useStyles).
 *
 * Web never reads it: there the marker classes and the system's context CSS
 * carry the same lookup with no JS. Context STATES (`'@within card:hover'`)
 * have no native carrier and never match on native.
 */
export const WithinContext = createContext<Readonly<Record<string, boolean>>>(
  Object.freeze({}),
)

/** The facts below a provider of `markers`, over the inherited `facts`. */
export function provideWithin(
  facts: Readonly<Record<string, boolean>>,
  markers: readonly string[],
): Readonly<Record<string, boolean>> {
  const next: Record<string, boolean> = {}
  const names = new Set(markers.map((marker) => marker.split('=')[0]!))
  for (const [key, value] of Object.entries(facts)) {
    const name = /^@within ([^=:]+)/.exec(key)?.[1]
    if (!name || !names.has(name)) next[key] = value
  }
  for (const marker of markers) {
    const [name, value] = marker.split('=')
    next[`@within ${name}`] = true
    if (value !== undefined) next[`@within ${name}=${value}`] = true
  }
  return Object.freeze(next)
}
