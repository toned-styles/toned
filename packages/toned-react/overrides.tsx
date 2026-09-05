import { createContext, createElement, useContext, useMemo, type ReactNode } from 'react'

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
 * sheet's matching entries apply in that order — the innermost provider wins
 * where keys collide. The derived sheet is built with the sheet's own
 * `extend`, so an override participates in resolution exactly like declared
 * rules (atomic classes, chains, variants preserved; nested pseudo/breakpoint
 * blocks deep-merge).
 *
 * Scope: render-time only. Module-level `bind()` cannot read context and is
 * never overridden.
 */

// biome-ignore lint/suspicious/noExplicitAny: the runtime is stylesheet-agnostic; index.ts provides the typed surface.
type AnyRules = Record<string, any>

export interface StyleOverrideEntry {
  sheet: object
  rules: AnyRules
}

/** Pair a stylesheet with partial rules. Typed via the index.ts re-export. */
export function overrideStyles(sheet: object, rules: AnyRules): StyleOverrideEntry {
  return { sheet, rules }
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
  return createElement(StyleOverridesContext.Provider, { value: merged }, children)
}

interface DerivedCache {
  /** The full context array the derivation was computed against. */
  context: readonly StyleOverrideEntry[]
  /** The matched entries (identities, in order) — revalidation short-circuit. */
  matched: readonly StyleOverrideEntry[]
  derived: object
}

/*
 * One cache slot per sheet. A different provider VALUE identity re-filters;
 * the derived sheet is rebuilt only when the matched entries actually change,
 * so an unrelated override appearing above does not re-instance this sheet.
 */
const derivedCache = new WeakMap<object, DerivedCache>()

function sameEntries(a: readonly StyleOverrideEntry[], b: readonly StyleOverrideEntry[]): boolean {
  if (a.length !== b.length) return false
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false
  return true
}

/**
 * The sheet this render should actually resolve: the sheet itself when no
 * provided entry matches it, else a derived sheet with the matching rules
 * extended in (cached, so identity is stable while the overrides are).
 */
export function useOverriddenSheet<T extends object>(sheet: T): T {
  const entries = useContext(StyleOverridesContext)
  if (entries.length === 0) return sheet

  const cached = derivedCache.get(sheet)
  if (cached && cached.context === entries) return cached.derived as T

  const matched = entries.filter(e => e.sheet === sheet)
  if (matched.length === 0) {
    // Remember the miss so the filter re-runs only when the context changes.
    derivedCache.set(sheet, { context: entries, matched, derived: sheet })
    return sheet
  }
  if (cached && sameEntries(cached.matched, matched)) {
    derivedCache.set(sheet, { context: entries, matched, derived: cached.derived })
    return cached.derived as T
  }

  let derived: object = sheet
  for (const entry of matched) {
    const extend = (derived as { extend?: (rules: AnyRules) => object }).extend
    if (typeof extend !== 'function') {
      throw new Error(
        'StyleOverrides: this stylesheet has no extend() — only sheets from createStylesheet/stylesheet() can be overridden.',
      )
    }
    derived = extend.call(derived, entry.rules)
  }
  derivedCache.set(sheet, { context: entries, matched, derived })
  return derived as T
}
