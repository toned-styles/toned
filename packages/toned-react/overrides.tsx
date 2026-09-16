import { type Config, overrideSheet } from '@toned/core'
import { immutableSnapshot } from '@toned/core/utils'
import {
  createContext,
  createElement,
  type ReactNode,
  useContext,
  useMemo,
} from 'react'
import { useRuntimeConfig } from './runtime-config.ts'

/**
 * Stylesheet overrides — the styling analogue of a slot/implementation
 * override: an ANCESTOR decides that a stylesheet resolves differently for the
 * subtree under it, and every `useStyles`/`useBind` of that sheet below picks
 * the decision up without the component threading anything.
 *
 * The mechanism is identity-keyed and deliberately knows nothing about paths,
 * zones or names: an entry pairs the SHEET OBJECT with a partial rules object,
 * and a sheet matches an entry by `===`. Which entries are provided WHERE is
 * the integration's job — a host that addresses parts of the tree (symbiote's
 * `Zone`, a router, a theme scope) renders `<StyleOverrides value={…}>` with
 * whatever it decided applies at that point. Core stays a context and a merge.
 *
 * Resolution: entries accumulate outer→inner (nesting concatenates), and a
 * sheet's matching entries become complete ordered override layers. The
 * selected scoped/provider policy chooses their order; later layers win
 * overlapping output fields, including variant and condition output.
 *
 * Scope: render-time only. Module-level `bind()` cannot read context and is
 * never overridden.
 */

// biome-ignore lint/suspicious/noExplicitAny: the runtime is stylesheet-agnostic; index.ts provides the typed surface.
type AnyRules = Record<string, any>

const OVERRIDE_ENTRY = Symbol.for('@toned/react/override-entry')
export function isStyleOverrideEntry(
  value: object,
): value is StyleOverrideEntry {
  return (value as Record<symbol, unknown>)[OVERRIDE_ENTRY] === true
}

export interface StyleOverrideEntry {
  readonly sheet: object
  readonly rules: Readonly<AnyRules>
  /**
   * Variant rules for the target sheet's OWN axes, resolved when the derived
   * sheet is built so they can use the sheet's key order (see
   * `mergeOverrideVariants` in core). Set by the entry's `.variants()`, which
   * is non-enumerable so an entry still compares and spreads as plain data.
   */
  // biome-ignore lint/suspicious/noExplicitAny: the selector is the sheet's, typed at the index.ts surface
  readonly variantRules?: ($: any) => AnyRules
  /**
   * When set, the entry applies only where the config's ambient scope matches
   * (config.useStyleOverrideScope + matchStyleOverrideScope — the host
   * integration's channel; the haelo host feeds symbiote's zone path).
   */
  readonly scope?: string
}

/**
 * Pair a stylesheet with partial rules. Typed via the index.ts re-export.
 *
 * The returned entry carries `.variants()`, spelled like the stylesheet's own
 * so an override says what a declaration says: `overrideStyles(sheet, {…})
 * .variants($ => ({ [$.size('sm')]: {…} }))`. It returns a NEW entry, so an
 * entry stays a plain value that can be shared and compared by identity.
 */
export function overrideStyles(
  sheet: object,
  rules: AnyRules,
  opts?: { scope?: string },
): StyleOverrideEntry {
  rules = immutableSnapshot(rules)
  const base: StyleOverrideEntry =
    opts?.scope !== undefined
      ? { sheet, rules, scope: opts.scope }
      : { sheet, rules }
  return withVariants(base)
}

/** Attach the chained `.variants()` without making it an enumerable field. */
function withVariants(entry: StyleOverrideEntry): StyleOverrideEntry {
  Object.defineProperty(entry, OVERRIDE_ENTRY, { value: true })
  Object.defineProperty(entry, 'variants', {
    // biome-ignore lint/suspicious/noExplicitAny: the selector is the sheet's own; index.ts types it
    value: (fn: ($: any) => AnyRules) =>
      withVariants({ ...entry, variantRules: fn }),
    enumerable: false,
  })
  return Object.freeze(entry)
}

/** Default scope match: the entry's scope appears in the ambient path as a
 * contiguous run of whole segments. */
export function matchesScopeDefault(
  scope: string,
  ambient: string | null | undefined,
): boolean {
  if (!ambient) return false
  if (scope === ambient) return true
  const a = ambient.split('/')
  const sPath = scope.split('/')
  outer: for (let i = 0; i + sPath.length <= a.length; i++) {
    for (let j = 0; j < sPath.length; j++) {
      if (a[i + j] !== sPath[j]) continue outer
    }
    return true
  }
  return false
}

const StyleOverridesContext = createContext<readonly StyleOverrideEntry[]>([])

export function StyleOverrides({
  value,
  children,
}: {
  value: readonly StyleOverrideEntry[]
  children?: ReactNode
}) {
  const outer = useContext(StyleOverridesContext)
  const merged = useMemo(() => [...outer, ...value], [outer, value])
  return createElement(
    StyleOverridesContext.Provider,
    { value: merged },
    children,
  )
}

interface DerivedCache {
  config: Config
  /** The full context array the derivation was computed against. */
  context: readonly StyleOverrideEntry[]
  /** The ambient scope at derivation time — scoped matching depends on it. */
  ambient: string | null | undefined
  /** The matched entries (identities, in order) — revalidation short-circuit. */
  matched: readonly StyleOverrideEntry[]
  derived: object
}

/** Bounded per-sheet LRU; sibling override sequences never evict each other
 * merely because React rendered them in alternating order. Weak sheet keys and
 * a finite limit bound retained derived plans, providers and token configs. */
const derivedCache = new WeakMap<object, DerivedCache[]>()
// A six-week Calendar has 42 sibling override scopes. The acceptance fixture
// proves 32 thrashes all 42 on a two-cell update; 64 retains the working set
// while keeping historical providers/configs bounded per source sheet.
const MAX_DERIVATIONS = 64
function remember(sheet: object, value: DerivedCache) {
  const entries = derivedCache.get(sheet) ?? []
  const previous = entries.findIndex(
    (entry) => entry.derived === value.derived && entry.config === value.config,
  )
  if (previous >= 0) entries.splice(previous, 1)
  entries.push(value)
  if (entries.length > MAX_DERIVATIONS) entries.shift()
  derivedCache.set(sheet, entries)
}

function sameEntries(
  a: readonly StyleOverrideEntry[],
  b: readonly StyleOverrideEntry[],
): boolean {
  if (a.length !== b.length) return false
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false
  return true
}

/**
 * The sheet this render should actually resolve: the sheet itself when no
 * provided entry matches it, else a derived sheet with the matching rules
 * extended in (cached, so identity is stable while the overrides are).
 */
const useNoOverrideScope = () => undefined

export function useOverriddenSheet<T extends object>(sheet: T): T {
  const entries = useContext(StyleOverridesContext)
  // The host integration's ambient scope. The hook identity is fixed at config
  // install time, so the call pattern is render-stable; absent hook = no scope.
  const config = useRuntimeConfig()
  const useOverrideScope = config.useStyleOverrideScope ?? useNoOverrideScope
  const ambient = useOverrideScope()
  if (entries.length === 0) return sheet

  const history = derivedCache.get(sheet) ?? []
  const cached = history.find(
    (entry) =>
      entry.config === config &&
      entry.context === entries &&
      entry.ambient === ambient,
  )
  if (
    cached &&
    cached.config === config &&
    cached.context === entries &&
    cached.ambient === ambient
  ) {
    remember(sheet, cached)
    return cached.derived as T
  }

  const matchScope = config.matchStyleOverrideScope ?? matchesScopeDefault
  const applicable = entries.filter(
    (e) =>
      e.sheet === sheet &&
      (e.scope === undefined || matchScope(e.scope, ambient)),
  )
  // Scoped entries apply after unscoped, most specific (deepest scope) last —
  // so specificity wins over provider order among scoped entries, matching the
  // zone-override intuition; ties keep provider order (stable sort).
  const matched = [...applicable].sort(
    (x, y) =>
      (x.scope === undefined ? 0 : x.scope.split('/').length) -
      (y.scope === undefined ? 0 : y.scope.split('/').length),
  )
  if (matched.length === 0) {
    // Remember the miss so the filter re-runs only when the context changes.
    remember(sheet, {
      config,
      context: entries,
      ambient,
      matched,
      derived: sheet,
    })
    return sheet
  }
  const equivalent = history.find(
    (entry) => entry.config === config && sameEntries(entry.matched, matched),
  )
  if (equivalent) {
    remember(sheet, {
      config,
      context: entries,
      ambient,
      matched,
      derived: equivalent.derived,
    })
    return equivalent.derived as T
  }

  let derived: object = sheet
  for (const entry of matched) {
    derived = (
      overrideSheet as (
        sheet: object,
        rules: unknown,
        variants?: unknown,
      ) => object
    )(derived, entry.rules, entry.variantRules)
  }
  remember(sheet, {
    config,
    context: entries,
    ambient,
    matched,
    derived,
  })
  return derived as T
}
