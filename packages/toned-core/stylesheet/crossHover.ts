/**
 * CSS-only cross-element channels: rewrites base-level `'source:<state>'`
 * cross-element keys into ordinary element rules BEFORE flattening, so no runtime
 * handlers are armed for them.
 *
 * Two families ride the same mechanism:
 * - `'source:hover'` — the group-hover channel. Hover-gated in the system css.
 * - `'source:<alias>'` for a DECLARED state (`open`, `checked`, …) — a parent's
 *   data-state styling a descendant (a trigger's `:open` rotating its chevron).
 *   Always live, like the self-state toggles.
 *
 * In both cases:
 * - The SOURCE element gains the `_s` marker class (via the `className` entry
 *   exec already merges). The system css toggles `--toned_src-<channel>` under
 *   `._s:hover` / `._s<state-selector>`, with a nested-source reset — so a
 *   target answers its NEAREST cross-element source, and only as a DOM
 *   descendant.
 * - Each TARGET property becomes a `:src-<channel>_<prop>` key — the same
 *   flattened shape a self pseudo takes in css mode, riding the standard
 *   custom-property fallback chains.
 *
 * Deliberately narrow: base-level, a SINGLE pseudo/state on a plain element
 * name. Focus/active pairs, compound `:state:hover`, and variant-scoped sources
 * keep the runtime path (and its warning) — a channel per (state × scope) stops
 * being "reliably CSS" and starts being a combinatorial contract.
 *
 * @module stylesheet/crossHover
 */

// biome-ignore lint/suspicious/noExplicitAny: rules are dynamically shaped
type AnyValue = any

const HOVER = ':hover'

/**
 * @param rules the stylesheet rules
 * @param stateAliases declared-state alias names (`['open', 'checked', …]`), so
 *   `'source:open'` is recognised as a CSS-channelable state and `'source:focus'`
 *   (a runtime interaction pseudo) is left alone.
 */
export function resolveCrossHoverCss(
  rules: AnyValue,
  stateAliases: readonly string[] = [],
): AnyValue {
  let out: AnyValue | undefined
  for (const key in rules) {
    const colon = key.indexOf(':')
    // Needs a non-empty source name and a suffix; skip self-pseudos (leading
    // ':'), attribute/media keys, and plain element names.
    if (colon <= 0) continue
    const sourceName = key.slice(0, colon)
    const suffix = key.slice(colon) // ':hover' | ':open' | ':hover:focus' | …
    if (
      sourceName.includes(':') ||
      sourceName[0] === '@' ||
      sourceName[0] === '['
    )
      continue

    // Which channel, if any, this suffix maps to. Only a single ':hover' or a
    // single declared-state suffix is CSS-channelable; anything else stays
    // runtime (handled downstream, with its warning).
    let channel: string | undefined
    if (suffix === HOVER) channel = 'src-hover'
    else if (
      suffix.indexOf(':', 1) === -1 &&
      stateAliases.includes(suffix.slice(1))
    )
      channel = `src-${suffix.slice(1)}`
    if (!channel) continue

    if (!(sourceName in rules)) continue
    const elementMap = rules[key]
    if (!elementMap || typeof elementMap !== 'object') continue

    out ??= { ...rules }
    delete out[key]

    const source = { ...(out[sourceName] ?? {}) }
    // One `_s` marker suffices however many channels a source drives (hover +
    // several states), so a multi-channel source does not accumulate duplicates.
    const classes: string = source.className ?? ''
    if (!classes.split(' ').includes('_s'))
      source.className = classes ? `${classes} _s` : '_s'
    out[sourceName] = source

    for (const targetKeyRaw in elementMap) {
      const targetKey = targetKeyRaw.replace(/^\$/, '')
      if (!(targetKey in rules)) continue
      const styles = elementMap[targetKeyRaw]
      if (!styles || typeof styles !== 'object') continue
      const target = { ...(out[targetKey] ?? {}) }
      for (const prop in styles) {
        if (prop[0] === '$') continue
        target[`:${channel}_${prop}`] = styles[prop]
      }
      out[targetKey] = target
    }
  }
  return out ?? rules
}
