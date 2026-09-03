/**
 * CSS generation utilities.
 *
 * @module dom/generate
 */

import { isAnimationDefinition } from '../types/index.ts'
import type { TokenStyleDeclaration } from '../types/index.ts'
import {
  DEFAULT_ALPHA_STEPS,
  alphaVarName,
  alphaWrappable,
  withAlphaExpr,
} from '../utils/alpha.ts'
import { bridgeVarName, camelToKebab } from '../utils/css.ts'

const tokens = new Proxy(
  {},
  {
    get(_target, prop: string) {
      return `var(--${prop})`
    },
  },
)

/**
 * Generate CSS from a token style declaration.
 */
export function generate<const S extends TokenStyleDeclaration>({
  breakpoints,
  animations,
  bridges,
  states,
  ...system
}: S) {
  let styles = ''

  // Declared state toggles — the attribute analogue of the pseudo toggles
  // below. Each state's selector, applied to the element (`._<selector>`),
  // empties `--toned_<alias>`; the nested reset keeps it self-scoped (a state
  // on an ancestor does not leak onto descendants' chains). Not hover-gated —
  // these are data-states, always live.
  if (states) {
    let stateToggles = ''
    for (const [alias, selector] of Object.entries(
      states as Record<string, string>,
    )) {
      const name = `--toned_${alias}`
      stateToggles += `html {${name}: initial;}`
      const sel =
        selector.startsWith(':') || selector.startsWith('[')
          ? `._${selector}`
          : `._ ${selector}`
      stateToggles += `${sel} {${name}: ;} ${sel} ._ {${name}: initial;} ${sel} ${sel} {${name}: ;}`

      // Cross-element source channel: a `_s` source IN this state sets
      // `--toned_src-<alias>` for its DOM descendants, so a target styled via a
      // base-level `'source:<alias>'` key answers its NEAREST such source (a
      // nested `_s` resets it). The state analogue of the `._s:hover` channel
      // emitted in the breakpoints block — not gated, data-states are always
      // live. Attribute/pseudo selectors attach to `._s` directly; a descendant
      // form (`._ sel`) has no single source element to mark, so it is skipped.
      if (selector.startsWith(':') || selector.startsWith('[')) {
        const srcName = `--toned_src-${alias}`
        const ssel = `._s${selector}`
        stateToggles += `html {${srcName}: initial;}`
        stateToggles += `${ssel} {${srcName}: ;} ${ssel} ._s {${srcName}: initial;} ${ssel} ${ssel} {${srcName}: ;}`
      }
    }
    styles += stateToggles
  }

  // Bridges: one static parameter-reading rule per target, plus the `._`
  // boundary reset so a parameter never inherits across component boundaries.
  // The reset precedes every token class (emitted below), so a setter class
  // beats it on order at equal specificity; an inline parameter wins outright.
  //
  // The unset fallback must preserve the property's pre-bridge behavior:
  // INHERITED properties fall back to `inherit` (an icon with no iconColor
  // keeps inheriting its parent's colour — `initial` painted them black),
  // everything else to `initial`.
  // A var-name → (bridge, cssProp, selector) index for the token loop below:
  // DESCENDANT bridges compile class-scoped (the setter class carries the
  // descendant rule directly), because an always-on `._ <sel>` rule
  // cascade-WINS over component css even when its parameter is unset — an
  // unset var's fallback still participates in the cascade, which blew every
  // un-tokened icon up to its intrinsic size. Their token values are closed
  // sets, so the class path is total. Pseudo-element bridges keep the
  // parameter mechanism (they attach to the element itself, tie with
  // component css at equal specificity, and lose to it on import order).
  const descendantBridgeVars = new Map<
    string,
    { selector: string; cssProp: string }
  >()
  if (bridges) {
    const INHERITED = new Set([
      'color',
      'fontFamily',
      'fontSize',
      'fontStyle',
      'fontWeight',
      'letterSpacing',
      'lineHeight',
      'textAlign',
      'textTransform',
      'visibility',
      'cursor',
    ])
    let resets = ''
    for (const [name, bridge] of Object.entries(bridges)) {
      if (!bridge.selector.startsWith(':')) {
        for (const prop of bridge.properties) {
          descendantBridgeVars.set(bridgeVarName(name, prop), {
            selector: bridge.selector,
            cssProp: camelToKebab(prop),
          })
        }
        continue
      }
      let rule = ''
      for (const prop of bridge.properties) {
        const varName = bridgeVarName(name, prop)
        resets += `${varName}: initial;`
        const fallback = INHERITED.has(prop) ? 'inherit' : 'initial'
        rule += `${camelToKebab(prop)}: var(${varName}, ${fallback});`
      }
      styles += `._${bridge.selector} {${rule}}`
    }
    if (resets) styles += `._ {${resets}}`
  }

  // Named animations: enumerated and system-compiled, like the tokens. The
  // matching `.animation_<name>` classes come from the `animation` token
  // `defineAnimations` returns, through the ordinary token loop below.
  if (animations) {
    for (const [name, entry] of Object.entries(animations)) {
      const frames = isAnimationDefinition(entry) ? entry.keyframes : entry
      let body = ''
      for (const [step, decl] of Object.entries(frames)) {
        let rule = ''
        for (const prop in decl) {
          rule += `${camelToKebab(prop)}:${decl[prop]};`
        }
        body += `${step} {${rule}}`
      }
      styles += `@keyframes toned_${name} {${body}}`
    }
  }

  if (breakpoints) {
    const bpValues = breakpoints.__breakpoints

    // The runtime-tracked states plus the css-only enhancements (:focus-visible
    // has no JS event and no native analogue — the browser decides it).
    const PSEUDO_STATES = ['hover', 'focus', 'focus-visible', 'active']

    let rootRule = ''
    let rules = ''

    PSEUDO_STATES.forEach((pseudo) => {
      const name = `--toned_${pseudo}`
      rootRule += `${name}: initial;`
      // make it work as expected with nested elements
      const toggles = `._:${pseudo} {${name}: ;} ._:${pseudo} ._ {${name}: initial;} ._:${pseudo} ._:${pseudo} {${name}: ;}`
      // Hover only exists where the primary input can hover — the same gate
      // every hover utility framework applies. Without it, a touch tap leaves
      // an element stuck in its hover style until the next tap elsewhere.
      rules +=
        pseudo === 'hover' ? `@media (hover: hover) {${toggles}}` : toggles
    })

    // The cross-element hover channel: a source element (marker class `_s`)
    // toggles `--toned_src-hover` for its DOM descendants; a nested source
    // resets it, so a target answers its NEAREST cross-element source.
    rootRule += '--toned_src-hover: initial;'
    rules +=
      '@media (hover: hover) {._s:hover {--toned_src-hover: ;} ' +
      '._s:hover ._s {--toned_src-hover: initial;} ' +
      '._s:hover ._s:hover {--toned_src-hover: ;}}'

    for (const [key, value] of Object.entries(bpValues)) {
      const varName = `--media-${camelToKebab(key).replace('@', '')}`

      rootRule += `${varName}: initial;`
      rules += `@media (min-width: ${value}px) { html { ${varName}: ; } }`
    }

    styles += `html {${rootRule}}`
    styles += rules
  }

  // handle custom tokens

  // Alpha machinery (see utils/alpha.ts): which CSS properties need their
  // @property parameter registered, and the per-token step classes.
  const alphaProps = new Set<string>()
  let alphaClasses = ''

  for (const key in system) {
    // biome-ignore lint/suspicious/noExplicitAny: the index union narrows structurally, not by type
    const token = system[key] as any

    // Skip non-token entries (like breakpoints)
    if (!token || !('values' in token) || !('resolve' in token)) continue

    const alphaChannel = (token as { alphaChannel?: readonly string[] })
      .alphaChannel
    if (alphaChannel) {
      const steps =
        (token as { alphaSteps?: readonly number[] }).alphaSteps ??
        DEFAULT_ALPHA_STEPS
      for (const step of steps) {
        const decl = alphaChannel
          .map((prop) => `${alphaVarName(prop)}:${step / 100}`)
          .join(';')
        const stepKey = `${key}$${step}`
        const stepSelector = stepKey.replace(/[^a-zA-Z0-9_-]/g, (c) => `\\${c}`)
        alphaClasses += `.${stepSelector}{${decl}}`
      }
    }

    // biome-ignore lint/suspicious/noExplicitAny: token values are dynamically typed
    token.values.forEach((value: any) => {
      if (value instanceof Number || value instanceof String) {
        // Skip boxed primitives - these represent dynamic/runtime values
        // that cannot be statically generated into CSS
        return
      }

      // Static CSS generation is the web target, so a per-platform token
      // resolves its web branch here (its native branch resolves inline under
      // the RN binding, which does not use generated CSS).
      const result = token.resolve(value, tokens, { platform: 'web' })

      if (!result) return

      let cssRule = ''
      const descendantRules = new Map<string, string>()

      for (const cssProp in result) {
        let cssValue = result[cssProp]
        // Descendant-bridge parameters compile into a class-scoped descendant
        // rule with the value inlined — see the bridge block above.
        const descendant = descendantBridgeVars.get(cssProp)
        if (descendant) {
          descendantRules.set(
            descendant.selector,
            `${descendantRules.get(descendant.selector) ?? ''}${descendant.cssProp}:${cssValue};`,
          )
          continue
        }
        // An alpha-capable colour routes through relative colour syntax with
        // its non-inheriting parameter, so `.bgColor$50` (or an inline
        // parameter) can wash it without a token x alpha rule explosion.
        if (alphaChannel?.includes(cssProp) && alphaWrappable(cssValue)) {
          alphaProps.add(cssProp)
          cssValue = withAlphaExpr(cssValue, `var(${alphaVarName(cssProp)}, 1)`)
        }
        cssRule += `${camelToKebab(cssProp)}:${cssValue};`
      }

      const ruleKey = `${key}_${value}`

      // The class NAME may contain characters that are valid in a class
      // attribute but meta-characters in a selector — `paddingX_0.5` needs to
      // be matched as `.paddingX_0\.5`. Escape the selector, not the name: the
      // runtime emits the unescaped form into className.
      const selector = ruleKey.replace(/[^a-zA-Z0-9_-]/g, (c) => `\\${c}`)

      if (cssRule) styles += `.${selector}{${cssRule}}`
      for (const [descSelector, body] of descendantRules) {
        styles += `.${selector} ${descSelector} {${body}}`
      }
    })
  }

  // `inherits: false` is load-bearing: an unregistered custom property
  // inherits, and a parent's wash would cascade onto every descendant's colour.
  for (const prop of alphaProps) {
    styles += `@property ${alphaVarName(prop)} {syntax:'<number>';inherits:false;initial-value:1;}`
  }
  styles += alphaClasses

  return styles
}
