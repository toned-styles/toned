import { type Prepared, prepare, type RawIndex } from './engine.ts'

let pending: Promise<Prepared> | undefined
let ready: Prepared | undefined

/** The index if it has already been loaded; never starts a request. */
export const loadedSearchIndex = () => ready

/**
 * Fetches and prepares the index once. Nothing calls this on page load: the
 * first call comes from focusing the search trigger or opening the palette.
 * A failed request is forgotten, so the next attempt tries again.
 */
export function loadSearchIndex(): Promise<Prepared> {
  pending ??= fetch(`${import.meta.env.BASE_URL}search-index.json`)
    .then((response) => {
      if (!response.ok)
        throw new Error(`Search index request failed: ${response.status}`)
      return response.json() as Promise<RawIndex>
    })
    .then((raw) => {
      ready = prepare(raw)
      return ready
    })
    .catch((error: unknown) => {
      pending = undefined
      throw error
    })
  return pending
}

const RECENT_KEY = 'toned-search-recent'
const RECENT_LIMIT = 5

/** Recent queries of this tab. Storage can be unavailable; then there are none. */
export function readRecent(): string[] {
  try {
    const stored: unknown = JSON.parse(
      sessionStorage.getItem(RECENT_KEY) ?? '[]',
    )
    return Array.isArray(stored)
      ? stored
          .filter((item): item is string => typeof item === 'string')
          .slice(0, RECENT_LIMIT)
      : []
  } catch {
    return []
  }
}

export function rememberQuery(query: string) {
  const value = query.trim().slice(0, 80)
  if (!value) return
  try {
    const next = [
      value,
      ...readRecent().filter(
        (item) => item.toLowerCase() !== value.toLowerCase(),
      ),
    ].slice(0, RECENT_LIMIT)
    sessionStorage.setItem(RECENT_KEY, JSON.stringify(next))
  } catch {
    // Private mode or a full quota: recent searches are a convenience only.
  }
}
