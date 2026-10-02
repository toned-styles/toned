import {
  type Config,
  type DerivationStep,
  derivationOf,
  derivationSteps,
} from '@toned/core'
import { SYMBOL_INIT } from '@toned/core/utils'
import {
  createContext,
  createElement,
  type ReactNode,
  useContext,
  useMemo,
} from 'react'

import { useRuntimeConfig } from './runtime-config.ts'

/**
 * Stylesheet overrides: an ANCESTOR decides that a stylesheet resolves
 * differently for the subtree under it, and every `useStyles`/`useBind` of
 * that sheet below picks the decision up without the component threading
 * anything.
 *
 * An override is an ordinary derived sheet, `sheet.extend(rules)`. The
 * provider is given the derived sheet; a component that asks for the sheet it
 * derives from resolves the derived one instead. Matching is by identity along
 * the derivation chain, and deliberately knows nothing about paths, zones or
 * names. Which overrides are provided WHERE is the integration's job.
 *
 * Resolution: entries accumulate outer→inner (nesting concatenates). When
 * several match one sheet, each one's extension steps are replayed over the
 * result of the one before, so later layers win overlapping output fields,
 * including variant and condition output.
 *
 * Scope: render-time only. Module-level `bind()` cannot read context and is
 * never overridden.
 */

/** A derived sheet, or one that applies only where the ambient scope matches. */
export type StyleOverride =
  | object
  | {
      /** The derived sheet, from `sheet.extend(…)`. */
      readonly sheet: object
      /**
       * When set, the override applies only where the config's ambient scope
       * matches (config.useStyleOverrideScope + matchStyleOverrideScope — the
       * host integration's channel; a host can feed it a zone or route path).
       */
      readonly scope?: string
    }

/** An entry in its provider, normalised once per provider value. */
interface OverrideEntry {
  readonly sheet: object
  readonly scope: string | undefined
}

const isScoped = (
  entry: StyleOverride,
): entry is { readonly sheet: object; readonly scope?: string } =>
  !(SYMBOL_INIT in entry) && 'sheet' in entry

const normalise = (value: readonly StyleOverride[]): OverrideEntry[] =>
  value.map((entry) => {
    const sheet = isScoped(entry) ? entry.sheet : entry
    if (!derivationOf(sheet))
      throw new Error(
        '[toned] StyleOverrides takes derived stylesheets. Pass `sheet.extend(rules)`, not the sheet itself or a plain rules object.',
      )
    return { sheet, scope: isScoped(entry) ? entry.scope : undefined }
  })

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

const StyleOverridesContext = createContext<readonly OverrideEntry[]>([])

export function StyleOverrides({
  value,
  children,
}: {
  value: readonly StyleOverride[]
  children?: ReactNode
}) {
  const outer = useContext(StyleOverridesContext)
  const merged = useMemo(
    () => [...outer, ...normalise(value)],
    [outer, value],
  )
  return createElement(
    StyleOverridesContext.Provider,
    { value: merged },
    children,
  )
}

type DerivationReplay = (
  rules: unknown,
  variants?: unknown,
  defaults?: Readonly<Record<string, unknown>>,
) => object
/** The core's derivation entry point; `sheet.extend` is the public spelling. */
const APPLY_DERIVATION = Symbol.for('@toned/override')

interface DerivedCache {
  config: Config
  /** The full context array the derivation was computed against. */
  context: readonly OverrideEntry[]
  /** The ambient scope at derivation time — scoped matching depends on it. */
  ambient: string | null | undefined
  /** The matched entries (identities, in order) — revalidation short-circuit. */
  matched: readonly OverrideEntry[]
  derived: object
}

/** Bounded per-sheet LRU; sibling override sequences never evict each other
 * merely because React rendered them in alternating order. Weak sheet keys and
 * a finite limit bound retained derived plans, providers and token configs. */
const derivedCache = new WeakMap<object, DerivedCache[]>()
// A six-week calendar has 42 sibling override scopes: a limit of 32 thrashes
// all 42 on a two-cell update, while 64 retains the working set and keeps
// historical providers/configs bounded per source sheet.
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
  a: readonly OverrideEntry[],
  b: readonly OverrideEntry[],
): boolean {
  if (a.length !== b.length) return false
  for (let i = 0; i < a.length; i++)
    if (a[i]?.sheet !== b[i]?.sheet || a[i]?.scope !== b[i]?.scope) return false
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
  // Read at the leaf so nested host contexts keep their scope. ConfigProvider
  // enforces this hook identity for its mounted lifetime; changing it requires
  // an explicit provider remount, preserving React's hook-order contract.
  const config = useRuntimeConfig(sheet)
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
  const steps = new Map<OverrideEntry, readonly DerivationStep[]>()
  const applicable = entries.filter((entry) => {
    if (entry.scope !== undefined && !matchScope(entry.scope, ambient))
      return false
    // The entry applies to the sheet it derives from, however many steps back.
    const chain = derivationSteps(entry.sheet, sheet)
    if (!chain?.length) return false
    steps.set(entry, chain)
    return true
  })
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

  // One match is the common case, and its sheet is already this sheet with
  // the extension applied. Further matches replay their steps on top.
  const [first, ...rest] = matched
  let derived: object = first?.sheet ?? sheet
  for (const entry of rest)
    for (const step of steps.get(entry) ?? []) {
      const replay = (derived as Record<symbol, DerivationReplay | undefined>)[
        APPLY_DERIVATION
      ]
      if (!replay) throw new Error('[toned] expected a Toned stylesheet')
      derived = replay.call(derived, step.rules, step.variants, step.defaults)
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
