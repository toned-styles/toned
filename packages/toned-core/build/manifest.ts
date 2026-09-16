import type { TokenStyleDeclaration } from '../types/index.ts'
import { adHocAtoms, parseConditionKey } from '../utils/conditions.ts'

/** Structural identity is compared exactly, never through the CSS content hash.
 * Function implementations still require the normal build/asset version pipeline. */
export function systemDefinition(system: TokenStyleDeclaration): string {
  const tokenShapes = Object.entries(system).flatMap(([name, token]) => {
    if (
      !token ||
      typeof token !== 'object' ||
      !('resolve' in token) ||
      !('values' in token)
    )
      return []
    return [
      [
        name,
        {
          values: token.values,
          properties: 'properties' in token ? token.properties : undefined,
          dynamic: 'dynamic' in token ? token.dynamic : undefined,
        },
      ],
    ]
  })
  return JSON.stringify({
    breakpoints: system.breakpoints,
    containers: system.containers,
    states: system.states,
    base: system.base,
    animations: system.animations,
    bridges: system.bridges,
    responsiveTokens: system.responsiveTokens,
    tokens: tokenShapes,
  })
}

/** Walk the complete immutable plan, including symbol-carried layers/ASTs.
 * No depth limit: nested conditions are a supported authoring feature. */
export function collectManifestConditions(
  input: unknown,
  out: Set<string>,
): void {
  const visited = new WeakSet<object>()
  const key = (name: string) => {
    if (!name.startsWith('@') || name.startsWith('@platform.')) return
    const expression = parseConditionKey(name.slice(1))
    if (expression)
      for (const atom of adHocAtoms(expression))
        out.add(`${atom.container}/>=${atom.min}`)
  }
  const walk = (value: unknown): void => {
    if (!value || typeof value !== 'object' || visited.has(value)) return
    visited.add(value)
    if (Array.isArray(value)) {
      value.forEach(walk)
      return
    }
    const record = value as Record<string | symbol, unknown>
    if (record['op'] === 'atom' && typeof record['key'] === 'string')
      key(record['key'])
    for (const name of Reflect.ownKeys(value)) {
      if (typeof name === 'string') {
        key(name)
        if (
          name === 'style' ||
          name === '$style' ||
          name === '$grid' ||
          name === '$area'
        )
          continue
      }
      walk(record[name])
    }
  }
  walk(input)
}
