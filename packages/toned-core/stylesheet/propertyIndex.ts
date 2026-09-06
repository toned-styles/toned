/**
 * Which CSS properties each token of a system writes, and what to do when two
 * different tokens write the same one.
 *
 * `paddingX` writes padding-left and padding-right; `paddingLeft` writes one of
 * them. Each compiles to its own atomic class of equal specificity, so when
 * both land on an element the winner is their order in the generated
 * stylesheet — an implementation detail of token declaration order, not
 * anything a caller can see or intend. An override that set `paddingLeft`
 * against a sheet whose base rule set `paddingX` therefore won or lost by
 * accident, and the only reliable escape was to write the value as a raw
 * inline style, which is what call sites were doing by hand.
 *
 * A token does not record its properties (`defineCssToken` knows them and
 * throws them away, and `defineToken` never had them), so they are recovered by
 * CALLING `resolve` with a probe and reading the keys back. Every declared
 * value is probed and the results unioned, because a resolve may branch on its
 * value and write different properties per branch. Probed once per system.
 *
 * WHAT THE FIX IS NOT. The first attempt decomposed the base token: drop
 * `paddingX`, put back `paddingRight` at the base's own value. That is unsound
 * across token families and calendar caught it — `textStep: 'sm'` writes
 * font-size AND line-height, an override's `leading` claims line-height, and
 * the remainder would have been handed to a font-size token as `'sm'`, a value
 * from a different vocabulary that happens to parse. A token's value only
 * means anything to the token that declared it.
 *
 * So the override's conflicting declaration is RESOLVED and moved to the
 * element's inline style instead. The base token keeps writing both of its
 * properties; the inline one wins the property the override actually named,
 * because inline beats a class. That is precisely the escape the call sites
 * were writing, applied automatically and only where there is a real conflict.
 */

// biome-ignore lint/suspicious/noExplicitAny: the runtime is system-agnostic
type AnyValue = any

/** Answers any token read with a harmless placeholder, so a resolve that
 * composes out of `tokens[…]` still returns the right SHAPE. Values are
 * irrelevant here; only which properties appear. */
const PROBE_TOKENS = new Proxy(
  {},
  { get: () => '0', has: () => true },
) as AnyValue

export interface PropertyIndex {
  /** Token name → the CSS properties it writes. */
  written: Map<string, ReadonlySet<string>>
}

const cache = new WeakMap<object, PropertyIndex>()

const RESERVED = new Set([
  'breakpoints',
  'responsiveTokens',
  'containers',
  'base',
  'states',
  'animations',
  'bridges',
])

export function propertyIndexOf(system: AnyValue): PropertyIndex {
  const cached = cache.get(system as object)
  if (cached) return cached

  const written = new Map<string, ReadonlySet<string>>()
  for (const name of Object.keys(system ?? {})) {
    if (RESERVED.has(name)) continue
    const token = system[name]
    const values: AnyValue[] | undefined = token?.values
    if (typeof token?.resolve !== 'function' || !Array.isArray(values)) continue
    const props = new Set<string>()
    for (const value of values) {
      try {
        const out = token.resolve(value, PROBE_TOKENS)
        if (out && typeof out === 'object')
          for (const key of Object.keys(out)) props.add(key)
      } catch {
        // A resolve that cannot survive the probe tells us nothing about its
        // properties. Leaving it out means the conflict check skips it, which
        // is today's behaviour rather than a new one.
      }
    }
    if (props.size > 0) written.set(name, props)
  }

  const index: PropertyIndex = { written }
  cache.set(system as object, index)
  return index
}

/**
 * Move an extension's conflicting declarations to the inline style.
 *
 * Returns the extension unchanged when nothing conflicts, or when no `tokens`
 * were supplied — resolving needs them, and `extend` is callable at module
 * scope where there are none. Composition there behaves exactly as before.
 */
export function inlineConflicts(
  base: AnyValue,
  extension: AnyValue,
  system: AnyValue,
  tokens: AnyValue,
  ctx: AnyValue,
): AnyValue {
  if (!tokens || !base || !extension) return extension
  if (typeof base !== 'object' || typeof extension !== 'object')
    return extension
  const { written } = propertyIndexOf(system)

  // What the BASE writes, by property, excluding tokens the extension replaces
  // by name — those the deep merge already settles.
  const baseProps = new Map<string, string>()
  for (const name of Object.keys(base)) {
    if (name in extension) continue
    for (const prop of written.get(name) ?? []) baseProps.set(prop, name)
  }
  if (baseProps.size === 0) return extension

  let out: AnyValue | undefined
  let style: AnyValue | undefined
  for (const name of Object.keys(extension)) {
    const props = written.get(name)
    if (!props) continue
    let conflicts = false
    for (const prop of props) {
      if (baseProps.has(prop)) {
        conflicts = true
        break
      }
    }
    if (!conflicts) continue

    const token = system[name]
    let resolved: AnyValue
    try {
      resolved = token.resolve(extension[name], tokens, ctx)
    } catch {
      continue
    }
    if (!resolved || typeof resolved !== 'object') continue

    out ??= { ...extension }
    style ??= { ...(out['style'] ?? {}) }
    // The caller's own `style` still wins: it is merged in after this.
    for (const [prop, value] of Object.entries(resolved)) {
      if (!(prop in style)) style[prop] = value
    }
    delete out[name]
  }
  if (!out) return extension
  out['style'] = style
  return out
}
