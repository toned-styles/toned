/**
 * CSS-only cross-element channels: rewrites base-level `'source:<state>'`
 * cross-element keys into ordinary element rules BEFORE flattening, so no runtime
 * handlers are armed for them.
 *
 * The families riding the mechanism:
 * - `'source:hover'` — the group-hover channel. Hover-gated in the system css.
 * - `'source:focus-within'` — a container's focus revealing a descendant.
 * - `'source:<alias>'` for a DECLARED state that offers the `ancestor`
 *   relation — a parent's data-state styling a descendant (a trigger's `:open`
 *   rotating its chevron). Always live, like the self-state toggles.
 * - `'source~:hover'` / `'source~:<alias>'` (a state that offers the
 *   `sibling` relation) — the SIBLING channel: the toggle reaches the source's
 *   following siblings (`._s… ~ ._`), the peer-recolor combinator (a button's
 *   hover recoloring the action beside it).
 *
 * A declared state read through a relation it does not declare throws, naming
 * the declaration to add (system/states.ts): the system emits no CSS for it.
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

import {
  type StateDeclaration,
  stateRelations,
  undeclaredRelationMessage,
} from '../system/states.ts'

// oxlint-disable-next-line typescript/no-explicit-any -- rules are dynamically shaped
type AnyValue = any

const HOVER = ':hover'

/**
 * @param rules the stylesheet rules
 * @param states the system's declared states, so `'source:open'` is
 *   recognised as a CSS-channelable state (when `open` offers the `ancestor`
 *   relation) and `'source:focus'` (a runtime interaction pseudo) is left alone.
 */
export function resolveCrossHoverCss(
  rules: AnyValue,
  states: Readonly<Record<string, StateDeclaration>> = {},
  knownParts?: ReadonlySet<string>,
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
    // A trailing '~' on the source name selects the SIBLING channel: the
    // toggle reaches the source's following siblings (`._s:hover ~ ._`)
    // instead of its descendants — the peer-recolor combinator.
    const sibling = sourceName.endsWith('~')
    const bareSource = sibling ? sourceName.slice(0, -1) : sourceName
    const prefix = sibling ? 'sib' : 'src'

    if (!(bareSource in rules) && !knownParts?.has(bareSource)) continue
    let channel: string | undefined
    if (suffix === HOVER) channel = `${prefix}-hover`
    else if (suffix === ':focus-within' && !sibling)
      channel = 'src-focus-within'
    else if (
      suffix.indexOf(':', 1) === -1 &&
      Object.hasOwn(states, suffix.slice(1))
    ) {
      const alias = suffix.slice(1)
      const relation = sibling ? 'sibling' : 'ancestor'
      if (!stateRelations(states[alias]).includes(relation))
        throw new Error(
          undeclaredRelationMessage(key, alias, relation, states[alias]!),
        )
      channel = `${prefix}-${alias}`
    }
    if (!channel) continue

    const elementMap = rules[key]
    if (!elementMap || typeof elementMap !== 'object') continue

    out ??= { ...rules }
    delete out[key]

    const source = { ...out[bareSource] }
    // One `_s` marker suffices however many channels a source drives (hover +
    // several states), so a multi-channel source does not accumulate duplicates.
    const classes: string = source.className ?? ''
    if (!classes.split(' ').includes('_s'))
      source.className = classes ? `${classes} _s` : '_s'
    out[bareSource] = source

    for (const targetKeyRaw in elementMap) {
      const targetKey = targetKeyRaw.replace(/^\$/, '')
      if (!(targetKey in rules) && !knownParts?.has(targetKey)) continue
      const styles = elementMap[targetKeyRaw]
      if (!styles || typeof styles !== 'object') continue
      const target = { ...out[targetKey] }
      for (const prop in styles) {
        if (prop[0] === '$') continue
        target[`:${channel}_${prop}`] = styles[prop]
      }
      out[targetKey] = target
    }
  }
  return out ?? rules
}
