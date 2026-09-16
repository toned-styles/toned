import { RULE_LAYERS } from './rule-protocol.ts'

type Tree = Record<string, unknown>
type Level = 'root' | 'part' | 'style'
const record = (value: unknown): value is Tree =>
  !!value &&
  typeof value === 'object' &&
  Object.getPrototypeOf(value) === Object.prototype

/** Null removes the inherited declaration at its exact path before matching.
 * Undefined inherits. Token payloads and branded layout/selector references are
 * opaque values, not declaration subtrees: deleting a shadowOffset is supported;
 * rewriting the internals of a grid owner or a custom token value is not.
 */
export function declarationLayers(rules: Tree): Tree[] {
  const layers: Tree[] = [
    rules,
    ...((rules as Record<symbol, Tree[]>)[RULE_LAYERS] ?? []),
  ]
  if (layers.length === 1) return layers
  const prepared: Tree[] = []
  const partNames = new Set(
    Object.keys(rules).filter((key) => !['@', '[', ':', '$'].includes(key[0]!)),
  )
  const levelFor = (level: Level, key: string): Level | undefined => {
    if (level === 'style') return undefined
    if (level === 'root')
      return key.startsWith('[') || key.startsWith('@') || key.includes(':')
        ? 'root'
        : 'part'
    if (key === 'style' || key === '$style') return 'style'
    if (
      ['@', '[', ':'].includes(key[0]!) ||
      partNames.has(key.replace(/^\$/, ''))
    )
      return 'part'
    return undefined
  }
  const copySymbols = (from: Tree, to: Tree) => {
    for (const symbol of Object.getOwnPropertySymbols(from))
      Object.defineProperty(
        to,
        symbol,
        Object.getOwnPropertyDescriptor(from, symbol)!,
      )
    return to
  }
  const remove = (tree: Tree, path: readonly string[]): Tree => {
    const [key, ...rest] = path
    if (!key || !Object.hasOwn(tree, key)) return tree
    const copy = { ...tree }
    if (!rest.length) delete copy[key]
    else if (record(copy[key])) copy[key] = remove(copy[key], rest)
    return copySymbols(tree, copy)
  }
  const clean = (tree: Tree, path: readonly string[], level: Level): Tree => {
    const result: Tree = {}
    for (const [key, value] of Object.entries(tree)) {
      if (value === undefined) continue
      const next = [...path, key]
      if (value === null) {
        for (let i = 0; i < prepared.length; i++)
          prepared[i] = remove(prepared[i]!, next)
      } else {
        const nested = levelFor(level, key)
        result[key] =
          nested && record(value) ? clean(value, next, nested) : value
      }
    }
    return copySymbols(tree, result)
  }
  prepared.push(layers[0]!)
  for (const layer of layers.slice(1)) prepared.push(clean(layer, [], 'root'))
  return prepared
}
