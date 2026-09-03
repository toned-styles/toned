/**
 * Interaction pseudo-states, shared by the runtime per-element tracking
 * (`StyleSheet`) and the CSS variable-chain generation (`definers`) so a new
 * pseudo is declared in exactly one place.
 *
 * @module utils/pseudo
 */

/**
 * Pseudo-states tracked per element for multi-instance stylesheets. Order only
 * affects the internal signature key, not rendered output.
 */
export const PSEUDO_STATES = [':hover', ':active', ':focus'] as const

/**
 * States that resolve through the CSS variable chains but have NO runtime
 * event pairing — web-only graceful enhancement. `:focus-visible` is the
 * canonical member: the browser decides it, no JS event reports it, and a
 * native renderer simply never activates it. Runtime pseudo mode ignores
 * these; css mode treats them exactly like the tracked set.
 */
export const CSS_ONLY_PSEUDO_STATES = [':focus-visible'] as const

export type PseudoState = (typeof PSEUDO_STATES)[number]

// Cascade precedence for CSS variable fallback chains: a higher number sits
// further out, so it wins. `:active` overrides `:focus` overrides `:hover`.
// Typed against PSEUDO_STATES so adding a pseudo without a priority is a
// compile error — keeping the two lists from drifting apart.
const PSEUDO_PRIORITY: Record<PseudoState | CssOnlyPseudoState, number> = {
  ':hover': 0,
  ':focus': 1,
  ':focus-visible': 2,
  ':active': 3,
}

export type CssOnlyPseudoState = (typeof CSS_ONLY_PSEUDO_STATES)[number]

/**
 * The pseudo-states in cascade order (outermost/highest priority last). Derived
 * from {@link PSEUDO_STATES}, so it is always a permutation of the tracked set.
 */
export const PSEUDO_CASCADE_ORDER: (PseudoState | CssOnlyPseudoState)[] = [
  ...PSEUDO_STATES,
  ...CSS_ONLY_PSEUDO_STATES,
].sort((a, b) => PSEUDO_PRIORITY[a] - PSEUDO_PRIORITY[b])

/**
 * Separator used to join an element's active pseudos into a signature string.
 * A control character keeps signatures unambiguous even if a future pseudo name
 * becomes a prefix of another (e.g. `:focus` vs `:focus-visible`).
 */
export const PSEUDO_SIGNATURE_SEPARATOR = '\u0000'
