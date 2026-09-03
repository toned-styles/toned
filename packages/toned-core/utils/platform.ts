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
  if (!isPlainObject(node)) return false
  for (const key in node) {
    if (key.startsWith(PREFIX)) return true
    if (hasPlatformKeys(node[key])) return true
  }
  return false
}

function deepMerge(base: AnyValue, over: AnyValue): AnyValue {
  if (!isPlainObject(base) || !isPlainObject(over)) return over
  const out: Record<string, AnyValue> = { ...base }
  for (const key in over) {
    out[key] = key in out ? deepMerge(out[key], over[key]) : over[key]
  }
  return out
}

function resolveNode(node: AnyValue, platform: string | undefined): AnyValue {
  if (!isPlainObject(node)) return node
  let out: Record<string, AnyValue> = {}
  let matched: AnyValue[] = []
  for (const key in node) {
    if (key.startsWith(PREFIX)) {
      if (key.slice(PREFIX.length) === platform) matched.push(node[key])
      continue
    }
    out[key] = resolveNode(node[key], platform)
  }
  // Platform content merges LAST, so it overrides sibling base keys — the same
  // relationship a more specific declaration always has here.
  for (const block of matched) {
    out = deepMerge(out, resolveNode(block, platform))
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
  const resolved = hasPlatformKeys(rules)
    ? (resolveNode(rules, platform) as T)
    : rules
  if (!byPlatform) {
    byPlatform = new Map()
    CACHE.set(rules, byPlatform)
  }
  byPlatform.set(cacheKey, resolved)
  return resolved
}
