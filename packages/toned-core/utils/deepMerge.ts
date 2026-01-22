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
