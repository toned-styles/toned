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
  baseElements: Set<string>,
): AnyValue {
  const result: AnyValue = {}
  const namedStyles: Record<string, AnyValue> = {}

  // First pass: collect named styles
  for (const key in variantRules) {
    if (isNamedStyleKey(key)) {
      const name = getNamedStyleName(key as `$named$_${string}`)
      namedStyles[name] = variantRules[key]
    }
  }

  // Second pass: process all rules
  for (const key in variantRules) {
    if (isNamedStyleKey(key)) {
      // Named styles are only used for composition, not applied directly
      continue
    }

    const rule = variantRules[key]
    const processedRule: AnyValue = {}

    // Handle variant-level $compose
    if (rule.$compose) {
      const composeNames = Array.isArray(rule.$compose)
        ? rule.$compose
        : [rule.$compose]

      for (const name of composeNames) {
        const namedStyle = namedStyles[name]
        if (namedStyle) {
          // Merge named style into this rule
          for (const elementKey in namedStyle) {
            processedRule[elementKey] = deepMerge(
              processedRule[elementKey],
              namedStyle[elementKey],
            )
          }
        }
      }
    }

    // Process element rules
    for (const elementKey in rule) {
      if (elementKey === '$compose') continue

      const elementRule = rule[elementKey]

      // Handle element-level $compose
      if (elementRule.$compose) {
        const composeElements = Array.isArray(elementRule.$compose)
          ? elementRule.$compose
          : [elementRule.$compose]

        let composedStyle: AnyValue = {}

        for (const composeElement of composeElements) {
          // Look up the element in base rules or in this rule
          if (baseElements.has(composeElement)) {
            // Will be resolved by StyleMatcher from base rules
            // For now, we just note that composition is needed
          }
          // Also check if element is defined in this variant rule
          if (rule[composeElement]) {
            const { $compose: _, ...elementStyle } = rule[composeElement]
            composedStyle = deepMerge(composedStyle, elementStyle)
          }
        }

        const { $compose: _, ...restElementRule } = elementRule
        processedRule[elementKey] = deepMerge(
          deepMerge(processedRule[elementKey], composedStyle),
          restElementRule,
        )
      } else {
        processedRule[elementKey] = deepMerge(
          processedRule[elementKey],
          elementRule,
        )
      }
    }

    result[key] = processedRule
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
