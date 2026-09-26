import { normalizeRules } from './normalizeRules.ts'
import type { RuleObject } from '../rule-protocol.ts'

type Normalization = ReturnType<typeof normalizeRules>

// Only immutable stylesheet/compiler inputs opt into this cache. Ordinary
// StyleMatcher construction still normalizes afresh, including mutable inputs.
// Source-order and platform modes are finite; weak ownership follows the declaration.
const cache = new WeakMap<
  object,
  [Normalization?, Normalization?, Normalization?, Normalization?]
>()

export function sharedRuntimeNormalization(
  rules: RuleObject,
  sourceOrder: boolean,
  platform: 'web' | 'native' = 'web',
): Normalization {
  let modes = cache.get(rules)
  if (!modes) {
    modes = []
    cache.set(rules, modes)
  }
  const mode = (sourceOrder ? 1 : 0) + (platform === 'native' ? 2 : 0)
  const existing = modes[mode]
  if (existing) return existing
  const normalized = normalizeRules(rules, {
    cssMediaMode: false,
    cssPseudoMode: false,
    sourceOrder,
    platform,
  })
  modes[mode] = normalized
  // Most sheets have no platform atoms inside Boolean expressions. Their
  // already platform-prepared input has identical runtime facts on both hosts.
  if (!normalized.hasPlatformQueries) modes[mode ^ 2] = normalized
  return normalized
}
