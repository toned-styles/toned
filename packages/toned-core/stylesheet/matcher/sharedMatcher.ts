import type { RuleObject } from '../rule-protocol.ts'
import { StyleMatcher } from '../StyleMatcher.ts'
import { sharedRuntimeNormalization } from './sharedNormalization.ts'

/*
 * Compiled matchers, shared across every Base built from the same rules.
 *
 * Normalization and bitmask matching are independent of mounted hosts.
 * Weak declaration ownership and five finite mode bits bound retention;
 * per-matcher result caches remain independently bounded.
 */
const MATCHER_CACHE = new WeakMap<object, Map<number, StyleMatcher>>()

export function sharedMatcher(
  rules: RuleObject,
  cssMediaMode: boolean,
  cssPseudoMode: boolean,
  stateAliases: Readonly<Record<string, string>> | undefined,
  platform?: 'web' | 'native',
  sourceOrder = false,
): StyleMatcher {
  let byMode = MATCHER_CACHE.get(rules)
  if (!byMode) {
    byMode = new Map()
    MATCHER_CACHE.set(rules, byMode)
  }
  const key =
    (cssMediaMode ? 1 : 0) |
    (cssPseudoMode ? 2 : 0) |
    (platform === 'native' ? 4 : platform === 'web' ? 8 : 0) |
    (sourceOrder ? 16 : 0)
  let matcher = byMode.get(key)
  if (!matcher) {
    // stateAliases are constant for a given rules object (one system per
    // stylesheet), so they never diverge across cache hits on the same rules.
    matcher = new StyleMatcher(
      rules,
      {
        cssMediaMode,
        cssPseudoMode,
        stateAliases: Object.keys(stateAliases ?? {}),
        platform,
        sourceOrder,
      },
      !cssMediaMode && !cssPseudoMode
        ? sharedRuntimeNormalization(rules, sourceOrder, platform ?? 'web')
        : undefined,
    )
    byMode.set(key, matcher)
  }
  return matcher
}
