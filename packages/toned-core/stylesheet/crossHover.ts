/**
 * CSS-only group-hover: rewrites base-level `'source:hover'` cross-element
 * keys into ordinary element rules BEFORE flattening, so no runtime handlers
 * are armed for them.
 *
 * - The SOURCE element gains the `_s` marker class (via the `className` entry
 *   exec already merges). The system css toggles `--toned_src-hover` under
 *   `._s:hover`, hover-gated, with a nested-source reset — so a target answers
 *   its NEAREST cross-element source, and only as a DOM descendant.
 * - Each TARGET property becomes a `:src-hover_<prop>` key — the same
 *   flattened shape a self pseudo takes in css mode, riding the standard
 *   custom-property fallback chains.
 *
 * Deliberately narrow: base-level, single `:hover` only. Focus/active pairs
 * and variant-scoped sources keep the runtime path (and its warning) — a
 * channel per (state × scope) stops being "reliably CSS" and starts being a
 * combinatorial contract.
 *
 * @module stylesheet/crossHover
 */

// biome-ignore lint/suspicious/noExplicitAny: rules are dynamically shaped
type AnyValue = any

const SUFFIX = ':hover'

export function resolveCrossHoverCss(rules: AnyValue): AnyValue {
  let out: AnyValue | undefined
  for (const key in rules) {
    if (!key.endsWith(SUFFIX)) continue
    const sourceName = key.slice(0, -SUFFIX.length)
    // single ':hover' on a plain element name only
    if (
      !sourceName ||
      sourceName.includes(':') ||
      sourceName[0] === '@' ||
      sourceName[0] === '['
    )
      continue
    if (!(sourceName in rules)) continue
    const elementMap = rules[key]
    if (!elementMap || typeof elementMap !== 'object') continue

    out ??= { ...rules }
    delete out[key]

    const source = { ...(out[sourceName] ?? {}) }
    source.className = source.className ? `${source.className} _s` : '_s'
    out[sourceName] = source

    for (const targetKeyRaw in elementMap) {
      const targetKey = targetKeyRaw.replace(/^\$/, '')
      if (!(targetKey in rules)) continue
      const styles = elementMap[targetKeyRaw]
      if (!styles || typeof styles !== 'object') continue
      const target = { ...(out[targetKey] ?? {}) }
      for (const prop in styles) {
        if (prop[0] === '$') continue
        target[`:src-hover_${prop}`] = styles[prop]
      }
      out[targetKey] = target
    }
  }
  return out ?? rules
}
