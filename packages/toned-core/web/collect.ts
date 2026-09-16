import { compileWebRules, isWebRules } from './rules.ts'

/** Explicit selector extensions have their own build inventory. They are not
 * interpreted as token declarations or recursive portable query grammar. */
export function collectWebRules(
  input: unknown,
  namespace: string,
): ReadonlyMap<string, string> {
  const artifacts = new Map<string, string>()
  const visited = new WeakSet<object>()
  const walk = (value: unknown, conditional = false) => {
    if (!value || typeof value !== 'object' || visited.has(value)) return
    visited.add(value)
    if (isWebRules(value)) {
      if (conditional)
        throw new Error(
          'Toned: $webRules is a separate selector extension; put state/descendant selectors in its &-anchored rules, not around it as a portable condition',
        )
      const artifact = compileWebRules(value, namespace)
      const previous = artifacts.get(artifact.className)
      if (previous !== undefined && previous !== artifact.css)
        throw new Error('Toned: webRules content identity collision')
      artifacts.set(artifact.className, artifact.css)
      return
    }
    for (const key of Reflect.ownKeys(value)) {
      const nested =
        conditional ||
        (typeof key === 'string' &&
          ((key.startsWith('@') && !key.startsWith('@platform')) ||
            key.startsWith(':'))) ||
        (typeof key === 'symbol' && Symbol.keyFor(key) === '@toned/when')
      walk((value as Record<PropertyKey, unknown>)[key], nested)
    }
  }
  walk(input)
  return artifacts
}
