/**
 * Variant processing utilities for stylesheet creation.
 *
 * Pure data-processing functions for handling variant rules,
 * including deep merging, key extraction, and $compose resolution.
 *
 * @module stylesheet/variantProcessing
 */

import { getNamedStyleName, isNamedStyleKey } from './variantSelector.ts'

// biome-ignore lint/suspicious/noExplicitAny: internal type alias for dynamic stylesheet values
type AnyValue = any

/**
 * Deep merge two objects, with source values overriding target values
 */
export function deepMerge(target: AnyValue, source: AnyValue): AnyValue {
  if (!source) return target
  if (!target) return source

  const result = { ...target }

  for (const key in source) {
    const sourceVal = source[key]
    const targetVal = target[key]

    if (
      sourceVal &&
      typeof sourceVal === 'object' &&
      !Array.isArray(sourceVal) &&
      targetVal &&
      typeof targetVal === 'object' &&
      !Array.isArray(targetVal)
    ) {
      // Recursively merge nested objects
      result[key] = deepMerge(targetVal, sourceVal)
    } else {
      // Override with source value
      result[key] = sourceVal
    }
  }

  return result
}

/**
 * Extract ordered keys from a ModType for stable key generation
 * Note: TypeScript preserves key order for interface/type definitions
 */
export function extractOrderedKeys(
  // We need at least one variant call to infer the keys
  variantRules: AnyValue,
): string[] {
  const keys = new Set<string>()

  // Parse keys from variant selectors like "[size=m][variant=accent]"
  for (const selector in variantRules) {
    if (selector.startsWith('$named$_')) continue

    const matches = selector.matchAll(/\[([^=\]]+)(?:=[^\]]+)?\]/g)
    for (const match of matches) {
      if (match[1] && match[1] !== '$NONE$') {
        keys.add(match[1])
      }
    }
  }

  return Array.from(keys)
}

/**
 * Process variant rules from callback result
 * - Resolves $compose for named styles
 * - Resolves $compose for elements
 */
export function processVariantRules(
  variantRules: AnyValue,
  baseRules: Record<string, AnyValue> | (() => Record<string, AnyValue>),
  defaultKind?: string,
): AnyValue {
  let defaults: Record<string, AnyValue> | undefined
  const getDefaults = () =>
    (defaults ??= typeof baseRules === 'function' ? baseRules() : baseRules)
  const result: AnyValue = {}
  const namedStyles = new Map<string, AnyValue>()
  const resolvedNames = new Map<string, AnyValue>()
  const visitingNames: string[] = []
  const isCondition = (key: string) => key.startsWith('@') || key.includes(':')

  for (const key of Object.keys(variantRules)) {
    if (isNamedStyleKey(key)) {
      namedStyles.set(getNamedStyleName(key), variantRules[key])
    }
  }

  function references(value: unknown, location: string): string[] {
    if (value === undefined) return []
    const names = Array.isArray(value) ? value : [value]
    if (names.some((name) => typeof name !== 'string' || !name)) {
      throw new Error(
        `Toned: ${location} $compose requires a name or an array of names`,
      )
    }
    return names as string[]
  }

  function validateNestedPlacement(style: AnyValue, location: string): void {
    for (const [key, child] of Object.entries(style)) {
      if (
        key === '$style' ||
        key === 'style' ||
        !child ||
        typeof child !== 'object' ||
        Array.isArray(child)
      )
        continue
      if (!(key.startsWith('@') || key.includes(':'))) continue
      if (Object.hasOwn(child, '$compose')) {
        throw new Error(
          `Toned: $compose belongs on a rule or part, not inside ${location}.${key}; put the condition around a part map`,
        )
      }
      validateNestedPlacement(child, `${location}.${key}`)
    }
  }

  function resolveNamed(name: string): AnyValue {
    if (resolvedNames.has(name)) return resolvedNames.get(name)
    if (!namedStyles.has(name)) {
      throw new Error(`Toned: unknown named style "${name}" in $compose`)
    }
    if (visitingNames.includes(name)) {
      throw new Error(
        `Toned: named style composition cycle: ${[...visitingNames, name].join(' -> ')}`,
      )
    }
    visitingNames.push(name)
    const resolved = resolveRule(namedStyles.get(name), `named style "${name}"`)
    visitingNames.pop()
    resolvedNames.set(name, resolved)
    return resolved
  }

  function resolveRule(
    rule: AnyValue,
    location: string,
    inheritedParts: () => Record<string, AnyValue> = getDefaults,
  ): AnyValue {
    let merged: AnyValue = {}
    for (const name of references(rule.$compose, location)) {
      merged = deepMerge(merged, resolveNamed(name))
    }
    for (const key of Object.keys(rule)) {
      if (key !== '$compose') merged[key] = deepMerge(merged[key], rule[key])
    }

    const resolved: AnyValue = {}
    const visitingParts: string[] = []
    function resolvePart(part: string): AnyValue {
      if (Object.hasOwn(resolved, part)) return resolved[part]
      if (
        isCondition(part) ||
        (!Object.hasOwn(merged, part) && !Object.hasOwn(inheritedParts(), part))
      ) {
        throw new Error(`Toned: unknown part "${part}" in ${location} $compose`)
      }
      if (visitingParts.includes(part)) {
        throw new Error(
          `Toned: part composition cycle in ${location}: ${[...visitingParts, part].join(' -> ')}`,
        )
      }
      visitingParts.push(part)
      const {
        $compose,
        $kind: _kind,
        $$type: _legacyKind,
        ...own
      } = Object.hasOwn(merged, part) ? merged[part] : inheritedParts()[part]
      validateNestedPlacement(own, `${location}.${part}`)
      let style: AnyValue
      for (const source of references($compose, `${location}.${part}`)) {
        const sourceStyle = resolvePart(source)
        const sourceDefaults = getDefaults()
        const sourceKind =
          sourceDefaults[source]?.$kind ??
          sourceDefaults[source]?.$$type ??
          defaultKind
        const targetKind =
          sourceDefaults[part]?.$kind ??
          sourceDefaults[part]?.$$type ??
          defaultKind
        if (
          sourceKind !== undefined &&
          targetKind !== undefined &&
          sourceKind !== targetKind
        ) {
          throw new Error(
            `Toned: cannot compose ${sourceKind} part "${source}" into ${targetKind} part "${part}" in ${location}`,
          )
        }
        style = deepMerge(style, sourceStyle)
      }
      visitingParts.pop()
      resolved[part] = style === undefined ? own : deepMerge(style, own)
      return resolved[part]
    }
    // Resolve in dependency order, but retain declaration order in the result.
    const output: AnyValue = {}
    for (const part of Object.keys(merged)) {
      if (!isCondition(part)) output[part] = resolvePart(part)
    }
    let childParts: Record<string, AnyValue> | undefined
    const getChildParts = () =>
      (childParts ??= { ...inheritedParts(), ...output })
    // Query groups contain part maps, not part styles. Resolve the same
    // composition vocabulary recursively under that condition's own layer.
    const ordered: AnyValue = {}
    for (const key of Object.keys(merged)) {
      ordered[key] = isCondition(key)
        ? resolveRule(merged[key], `${location}.${key}`, getChildParts)
        : output[key]
    }
    return ordered
  }

  // Validate even unused fragments, so dead declarations cannot hide mistakes.
  for (const name of namedStyles.keys()) resolveNamed(name)
  for (const key of Object.keys(variantRules)) {
    if (!isNamedStyleKey(key)) result[key] = resolveRule(variantRules[key], key)
  }

  return result
}

/**
 * Merge base rules with variant rules for StyleMatcher
 * StyleMatcher now handles both the new API format and internal format directly
 */
export function mergeRules(
  baseRules: AnyValue,
  variantRules?: AnyValue,
): AnyValue {
  if (!variantRules) return baseRules
  return { ...baseRules, ...variantRules }
}
