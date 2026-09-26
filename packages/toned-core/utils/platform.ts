/**
 * `'@platform.<name>'` stylesheet keys — platform-conditional styling.
 *
 * Unlike breakpoints (which vary at runtime and resolve through CSS variable
 * toggles or listeners), the platform is static for the life of a process, so
 * these keys resolve by PRE-FILTERING the rules before compilation: a key
 * matching the running config's `platform` deep-merges into its parent (the
 * platform block wins over sibling base keys), every other platform's key is
 * dropped. The matcher then compiles ordinary rules — no runtime machinery,
 * no CSS emitted for foreign platforms.
 *
 *   root: {
 *     paddingX: 4,
 *     '@platform.web': { style: { whiteSpace: 'nowrap' } },
 *     '@platform.native': { style: { includeFontPadding: false } },
 *   }
 *
 * @module utils/platform
 */

import { isGrid, isGridArea, resolveGrid } from '../grid/index.ts'
import { declarationLayers } from '../stylesheet/removals.ts'
import { RULE_LAYERS } from '../stylesheet/rule-protocol.ts'

// biome-ignore lint/suspicious/noExplicitAny: rules are dynamically shaped
type AnyValue = any

const PREFIX = '@platform.'

const isPlainObject = (v: unknown): v is Record<string, AnyValue> =>
  typeof v === 'object' &&
  v !== null &&
  !Array.isArray(v) &&
  !(v instanceof Number) &&
  !(v instanceof String)

function hasPlatformKeys(node: AnyValue): boolean {
  if (Array.isArray(node)) return node.some(hasPlatformKeys)
  if (!isPlainObject(node)) return false
  for (const key in node) {
    if (key.startsWith(PREFIX) || key === '$grid' || key === '$area')
      return true
    if (hasPlatformKeys(node[key])) return true
  }
  return Object.getOwnPropertySymbols(node).some((symbol) =>
    hasPlatformKeys(node[symbol as unknown as string]),
  )
}

function deepMerge(base: AnyValue, over: AnyValue): AnyValue {
  // Grid references carry immutable ownership identity; never merge their internals.
  if (isGrid(over) || isGridArea(over)) return over
  if (!isPlainObject(base) || !isPlainObject(over)) return over
  const out: Record<string, AnyValue> = { ...base }
  for (const key in over) {
    out[key] = key in out ? deepMerge(out[key], over[key]) : over[key]
  }
  return out
}

function resolveNode(
  node: AnyValue,
  platform: string | undefined,
  materialize = true,
): AnyValue {
  if (Array.isArray(node))
    return node.map((value) => resolveNode(value, platform, materialize))
  if (!isPlainObject(node)) return node
  let out: Record<string, AnyValue> = {}
  const matched: AnyValue[] = []
  for (const key in node) {
    if (key.startsWith(PREFIX)) {
      const name = key.slice(PREFIX.length)
      if (name !== 'web' && name !== 'native')
        throw new Error(`Toned: unknown platform ${name}`)
      if (name === platform) matched.push(node[key])
      continue
    }
    if (key === '$grid' || key === '$area') {
      out[key] = node[key]
      if (materialize)
        out['style'] = {
          ...out['style'],
          ...resolveGrid(node[key], platform === 'native' ? 'native' : 'web'),
        }
    } else {
      const value = resolveNode(node[key], platform, materialize)
      out[key] = key === 'style' ? { ...out['style'], ...value } : value
    }
  }
  for (const symbol of Object.getOwnPropertySymbols(node)) {
    Object.defineProperty(out, symbol, {
      value: resolveNode(
        node[symbol as unknown as string],
        platform,
        materialize,
      ),
      enumerable: true,
      configurable: true,
    })
  }
  // Platform content merges LAST, so it overrides sibling base keys — the same
  // relationship a more specific declaration always has here.
  for (const block of matched) {
    out = deepMerge(out, resolveNode(block, platform, materialize))
  }
  return out
}

/*
 * Identity-preserving memo: rules without platform keys return the SAME object
 * (matcher sharing stays keyed on it), and resolved variants are cached per
 * (rules, platform) so every instance shares one processed tree too.
 */
const CACHE = new WeakMap<object, Map<string, AnyValue>>()

export function resolvePlatformKeys<T>(
  rules: T,
  platform: string | undefined,
): T {
  if (!isPlainObject(rules)) return rules
  const cacheKey = platform ?? ''
  let byPlatform = CACHE.get(rules)
  if (byPlatform?.has(cacheKey)) return byPlatform.get(cacheKey) as T
  let resolved: T = rules
  if (hasPlatformKeys(rules)) {
    // Select platform paths before exact-path removals, but materialize opaque
    // grid values only afterwards. Otherwise null becomes invalid layout input
    // and earlier grid-generated style fields survive their token's removal.
    const selected = resolveNode(rules, platform, false)
    const layers = declarationLayers(selected).map((layer) => {
      const clean = { ...layer }
      delete (clean as Record<symbol, unknown>)[RULE_LAYERS]
      return resolveNode(clean, platform)
    })
    const base = layers[0]!
    if (layers.length > 1)
      Object.defineProperty(base, RULE_LAYERS, {
        value: layers.slice(1),
        enumerable: true,
      })
    resolved = base as T
  }
  if (!byPlatform) {
    byPlatform = new Map()
    CACHE.set(rules, byPlatform)
  }
  byPlatform.set(cacheKey, resolved)
  if (resolved !== rules) {
    // A prepared tree may retain grid references for registration/validation.
    // Its generated fields and override layers must not be materialized twice.
    CACHE.set(resolved as object, new Map([[cacheKey, resolved]]))
  }
  return resolved
}
