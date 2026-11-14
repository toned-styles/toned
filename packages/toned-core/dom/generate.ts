import {
  resolveAlphaChannels,
  resolveConfiguredToken,
} from '../core/resolve.ts'
import { SHORTHANDS } from '../core/shorthands.ts'
import { namespaceCss } from '../system/namespace.ts'
import { responsivePairs } from '../system/responsive.ts'
import {
  isElementSelector,
  needsHover,
  type StateDeclaration,
  stateRelations,
  stateSelector,
  validateStates,
} from '../system/states.ts'
import type { TokenStyleDeclaration } from '../types/index.ts'
import { isAnimationDefinition } from '../types/index.ts'
import {
  alphaVarName,
  alphaWrappable,
  DEFAULT_ALPHA_STEPS,
  withAlphaExpr,
} from '../utils/alpha.ts'
import {
  assertConditionSlugs,
  atomSlug,
  parseConditionKey,
} from '../utils/conditions.ts'
import { serializeCssValue } from '../utils/css-value.ts'
import { bridgeVarName, camelToKebab } from '../utils/css.ts'
/**
 * CSS generation utilities.
 *
 * @module dom/generate
 */
import { isMediaCondition } from '../utils/media-query.ts'

/** Four-sided shorthands: the longhands a rule may replace with the shorthand
 *  when it sets all four to one value. */
const FOUR_SIDES = (
  [
    'margin',
    'padding',
    'inset',
    'borderWidth',
    'borderStyle',
    'borderColor',
    'borderRadius',
  ] as const
).map((shorthand) => [shorthand, SHORTHANDS[shorthand]] as const)

/**
 * One rule setting all four longhands of a side shorthand to one value is
 * exactly the shorthand: both set the same four properties, in the same rule,
 * at the same specificity and order. A token resolving `margin` to four
 * physical longhands therefore costs one declaration instead of four. Values
 * are compared after serialization, so `0` and `'0px'` stay distinct.
 */
function collapseSides(
  fields: Record<string, unknown>,
): Record<string, unknown> {
  let out: Record<string, unknown> | undefined
  for (const [shorthand, longhands] of FOUR_SIDES) {
    if (shorthand in fields) continue
    const first = fields[longhands[0]]
    if (first === undefined) continue
    const value = serializeCssValue(longhands[0], first)
    if (
      !longhands.every(
        (longhand) =>
          longhand in fields &&
          serializeCssValue(longhand, fields[longhand]) === value,
      )
    )
      continue
    out ??= { ...fields }
    for (const longhand of longhands) delete out[longhand]
    out[shorthand] = first
  }
  return out ?? fields
}

// The runtime-tracked states plus the css-only enhancements (:focus-visible
// has no JS event and no native analogue — the browser decides it).
const PSEUDO_STATES = [
  'hover',
  'focus',
  'focus-visible',
  'focus-within',
  'active',
] as const

const tokens = new Proxy(Object.create(null), {
  get(_target, prop: string) {
    return `var(--${prop})`
  },
  // Build symbols deliberately represent every theme key; runtime themes
  // still require a real own property before a themeRef can resolve.
  getOwnPropertyDescriptor(_target, prop) {
    return typeof prop === 'string'
      ? { configurable: true, enumerable: true, value: `var(--${prop})` }
      : undefined
  },
})

/**
 * Generate CSS from a token style declaration.
 *
 * `scope` (an ancestor selector, e.g. `.my-design-system`) namespaces the emitted
 * rules so two systems can share one page without their identically-named
 * atomic classes fighting: a scoped system's classes, alpha steps, state and
 * pseudo toggles apply only under the scope element, while the `html {}`
 * custom-property inits, `@property` registrations and `@keyframes` stay
 * global — they are idempotent inits, not values, and duplicating them is
 * harmless. An unscoped system is the page's default and wins everywhere
 * outside the scope; inside it, the scoped rules out-specify it.
 */
export function generate<const S extends TokenStyleDeclaration>(
  declaration: S,
  opts?: {
    scope?: string
    /** Stable system identity; namespaces classes, parameters and animations. */
    id?: string
    /**
     * Ad-hoc condition ATOMS to emit toggles for (canonical `name/>=len`
     * spellings) — the union a generator script collects from the system
     * ref's `usedConditions` after importing every stylesheet module.
     */
    conditions?: readonly string[]
  },
) {
  const {
    breakpoints,
    animations,
    bridges,
    states,
    responsiveTokens: _responsiveTokens,
    containers,
    base,
    layoutContext: layout,
    externalCssVariables,
    ...system
  } = declaration
  const responsive = responsivePairs(declaration)
  assertConditionSlugs({ breakpoints, containers }, opts?.conditions)
  const scope = opts?.scope ? `${opts.scope} ` : ''
  let styles = ''

  // Declared state toggles — the attribute analogue of the pseudo toggles
  // below. Each state's selector, applied to the element (`._<selector>`),
  // empties `--toned_<alias>` and sets its `-not` complement to `initial`.
  //
  // The toggle is self-scoped by REGISTRATION (`inherits: false`): a state on
  // an ancestor never reaches a descendant's chain. It used to be self-scoped
  // by a reset rule on the subtree (`._<sel> ._`), whose rightmost `._` is
  // every styled element: each one checked its ancestors once per declared
  // state, on every style recalculation.
  //
  // Data states are always live; a state whose selector needs `:hover` is
  // gated like `:hover` itself (see PSEUDO_STATES below).
  //
  // Relation channels are emitted only for the relations a state declares
  // (system/states.ts): each one is CSS every styled element pays for.
  const declaredStates = (states ?? {}) as Record<string, StateDeclaration>
  validateStates(declaredStates)
  const stateInits: string[] = []
  // Complement channels make q.not(state) equivalent on CSS and native: every
  // bound element rests at "not in the state" (valid-empty `-not`), so a
  // parent's state never answers for a child. ONE resting rule carries every
  // complement, and it precedes every toggle, so a toggle whose selector adds
  // no specificity (`:where(…)`) still wins on order.
  styles += `${scope}._ {${[...PSEUDO_STATES, ...Object.keys(declaredStates)]
    .map((name) => `--toned_${name}-not: ;`)
    .join('')}}`
  {
    let stateToggles = ''
    for (const [alias, declaration] of Object.entries(declaredStates)) {
      const selector = stateSelector(declaration)
      const relations = stateRelations(declaration)
      const gate = needsHover(selector)
        ? (rules: string) => `@media (hover: hover) {${rules}}`
        : (rules: string) => rules
      const name = `--toned_${alias}`
      const element = isElementSelector(selector)
      const sel = element ? `._${selector}` : `._ ${selector}`
      let rules = `@property ${name} {syntax:'*';inherits:false;}`
      rules += element
        ? `${scope}${sel} {${name}: ;${name}-not: initial;}`
        : `${scope}${sel} {${name}: ;} ${scope}._${selector} {${name}-not: initial;}`

      // Cross-element source channel: a `_s` source IN this state sets
      // `--toned_src-<alias>` for its DOM descendants, so a target styled via a
      // base-level `'Source:<alias>'` key answers its NEAREST such source (a
      // nested `_s` resets it). The state analogue of the `._s:hover` channel.
      if (relations.includes('ancestor')) {
        const srcName = `--toned_src-${alias}`
        const ssel = `._s${selector}`
        stateInits.push(`${srcName}: initial;`)
        rules += `${scope}${ssel} {${srcName}: ;} ${scope}${ssel} ._s {${srcName}: initial;} ${scope}${ssel} ${ssel} {${srcName}: ;}`
      }

      // SIBLING source channel: the same state on a `_s` source toggles
      // `--toned_sib-<alias>` on its FOLLOWING SIBLINGS (the `~` combinator
      // of peer-recolor css), self-scoped by registration. Each element
      // checks every earlier sibling for it, so a long flat list pays for it
      // quadratically: only states that declare it get it.
      if (relations.includes('sibling')) {
        const sibName = `--toned_sib-${alias}`
        rules += `@property ${sibName} {syntax:'*';inherits:false;}`
        rules += `${scope}._s${selector} ~ ._ {${sibName}: ;}`
      }
      stateToggles += gate(rules)
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
  // keeps inheriting its parent's colour — `initial` would paint it black),
  // everything else to `initial`.
  // A var-name → (bridge, cssProp, selector) index for the token loop below:
  // DESCENDANT bridges compile class-scoped (the setter class carries the
  // descendant rule directly), because an always-on `._ <sel>` rule
  // cascade-WINS over component css even when its parameter is unset — an
  // unset var's fallback still participates in the cascade, which would blow every
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
      styles += `${scope}._${bridge.selector} {${rule}}`
    }
    if (resets) styles += `${scope}._ {${resets}}`
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
          rule += `${camelToKebab(prop)}:${serializeCssValue(prop, decl[prop])};`
        }
        body += `${step} {${rule}}`
      }
      styles += `@keyframes toned_${name} {${body}}`
    }
  }

  {
    // Interaction state toggles exist independently of viewport breakpoints.
    const bpValues = breakpoints?.__breakpoints ?? {}

    let rootRule = ''
    let rules = ''

    PSEUDO_STATES.forEach((pseudo) => {
      const name = `--toned_${pseudo}`
      rootRule += `${name}: initial;`
      // Reset under a pseudo-active element so its nested elements do not
      // inherit the toggle; a nested element in the same pseudo re-enables it.
      const toggles = `${scope}._:${pseudo} {${name}: ;} ${scope}._:${pseudo} ._ {${name}: initial;} ${scope}._:${pseudo} ._:${pseudo} {${name}: ;}`
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
      `@media (hover: hover) {${scope}._s:hover {--toned_src-hover: ;} ` +
      `${scope}._s:hover ._s {--toned_src-hover: initial;} ` +
      `${scope}._s:hover ._s:hover {--toned_src-hover: ;}}`

    // Its focus-within twin (a container's focus revealing a descendant —
    // e.g. a list row's actions): pure css, no JS event, never hover-gated.
    rootRule += '--toned_src-focus-within: initial;'
    rules +=
      `${scope}._s:focus-within {--toned_src-focus-within: ;} ` +
      `${scope}._s:focus-within ._s {--toned_src-focus-within: initial;} ` +
      `${scope}._s:focus-within ._s:focus-within {--toned_src-focus-within: ;}`

    // The SIBLING hover channel: a hovered source toggles
    // `--toned_sib-hover` on its FOLLOWING SIBLINGS (`~`), self-scoped to the
    // sibling element itself — the peer-recolor shape (`.button:hover ~
    // .action`) the descendant channel cannot say. Registered non-inheriting
    // rather than reset on the subtree, as the sibling state toggles above.
    rootRule += '--toned_sib-hover: initial;'
    rules +=
      `@property --toned_sib-hover {syntax:'*';inherits:false;}` +
      `@media (hover: hover) {${scope}._s:hover ~ ._ {--toned_sib-hover: ;}}`

    for (const [key, value] of Object.entries(bpValues)) {
      const varName = `--media-${camelToKebab(key).replace('@', '')}`

      // Each condition carries a COMPLEMENT toggle beside the positive one:
      // `-not` is valid-empty exactly when the positive is invalid, which is
      // what lets a chain guard on `not(condition)` (see utils/conditions.ts).
      rootRule += `${varName}: initial;${varName}-not: ;`
      // A number is pixels; a string ('40rem') passes through, so a system can
      // declare a rem-based scale that tracks the user's root font size. A
      // parenthesised string is a raw media CONDITION ('(pointer: coarse)') —
      // the same toggle machinery, gated on the condition instead of a width.
      const condition = isMediaCondition(value)
        ? value
        : `(min-width: ${typeof value === 'number' ? `${value}px` : value})`
      rules += `@media ${condition} { html { ${varName}: ; ${varName}-not: initial; } }`
    }

    for (const atomKey of [...(opts?.conditions ?? [])].sort()) {
      const atom = parseConditionKey(atomKey)?.[0]?.[0]
      if (!atom || atom.container !== null || atom.step !== null) continue
      const variable = `--${atomSlug(atom)}`
      rootRule += `${variable}: initial;${variable}-not: ;`
      rules += `@media (min-width: ${atom.min}) { html { ${variable}: ; ${variable}-not: initial; } }`
    }
    rootRule += stateInits.join('')
    styles += `html {${rootRule}}`
    styles += rules
  }

  // The pseudo-state complements' `initial` (their resting value is set with
  // the declared states' above; a declared state's rides its toggle).
  for (const name of PSEUDO_STATES) {
    const rule = `${scope}._:${name} {--toned_${name}-not: initial;}`
    styles += name === 'hover' ? `@media (hover: hover) {${rule}}` : rule
  }

  // Container-condition toggles — the `@container` analogue of the media
  // toggles above, with one difference: the OFF init sits on `._` ITSELF, not
  // on html. The on-value is valid-empty and custom properties inherit, so an
  // html-level init would let an outer element's ON leak into a descendant
  // whose own nearest same-name container does not match; a per-element init
  // makes every `._` carry its own answer. The `@container <name>` on-rule
  // (same specificity, later in source) flips it exactly where css evaluates
  // the element's NEAREST ancestor container of that name as matching — the
  // runtime binding mirrors that lookup on native. Chains guard on
  // `var(--cq-<name>-<step>)`.
  if (containers || opts?.conditions?.length) {
    let cqResets = ''
    let cqRules = ''
    // Container NUMBERS ride the universal spacing scale (× base, default
    // 4px) — the same numeric language as every other token, and the reason
    // rem never needs to appear: native has no rem, px is the shared floor.
    const unitPx = (base as number | undefined) ?? 4
    const emitContainerToggle = (
      name: string,
      slug: string,
      value: number | string,
    ) => {
      const varName = `--cq-${camelToKebab(name)}-${slug}`
      cqResets += `${varName}: initial;${varName}-not: ;`
      // A string length passes through (web-only escape); a parenthesised
      // string is a raw container CONDITION, same as the media scale.
      const condition = isMediaCondition(value)
        ? value
        : `(min-width: ${typeof value === 'number' ? `${value * unitPx}px` : value})`
      cqRules += `@container ${name} ${condition} { ${scope}._ { ${varName}: ; ${varName}-not: initial; } }`
    }
    for (const [name, steps] of Object.entries(
      (containers ?? {}) as Record<string, Record<string, number | string>>,
    )) {
      for (const [step, value] of Object.entries(steps)) {
        emitContainerToggle(name, camelToKebab(step), value)
      }
    }
    // AD-HOC condition atoms — min-widths used at stylesheet call sites on
    // declared container names, registered by createStylesheet on the system
    // ref and passed here by the generator script (which must import the
    // stylesheet modules first). Sorted for deterministic output.
    for (const atomKey of [...(opts?.conditions ?? [])].sort()) {
      const expr = parseConditionKey(atomKey)
      const atom = expr?.[0]?.[0]
      if (!atom || atom.container === null || atom.step !== null) continue
      emitContainerToggle(
        atom.container,
        atomSlug(atom).slice(`cq-${camelToKebab(atom.container)}-`.length),
        atom.min!,
      )
    }
    styles += `${scope}._ {${cqResets}}`
    styles += cqRules
  }

  // handle custom tokens

  // Alpha machinery (see utils/alpha.ts): which CSS properties need their
  // @property parameter registered, and the per-token step classes.
  const alphaProps = new Set<string>()
  let alphaClasses = ''

  for (const key in system) {
    // oxlint-disable-next-line typescript/no-explicit-any -- the index union narrows structurally, not by type
    const token = system[key] as any

    // Skip non-token entries (like breakpoints)
    if (!token || !('values' in token) || !('resolve' in token)) continue

    const authoredAlphaChannel = (token as { alphaChannel?: readonly string[] })
      .alphaChannel
    const alphaChannel =
      authoredAlphaChannel &&
      resolveAlphaChannels(authoredAlphaChannel, {
        ...layout,
        canonicalFields: !!opts?.id,
      })
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
        alphaClasses += `${scope}.${stepSelector}{${decl}}`
      }
    }

    // oxlint-disable-next-line typescript/no-explicit-any -- token values are dynamically typed
    token.values.forEach((value: any) => {
      if (value instanceof Number || value instanceof String) {
        // Skip boxed primitives - these represent dynamic/runtime values
        // that cannot be statically generated into CSS
        return
      }

      // Static CSS generation is the web target, so a per-platform token
      // resolves its web branch here (its native branch resolves inline under
      // the RN binding, which does not use generated CSS).
      const result = resolveConfiguredToken(token, value, tokens, {
        ...layout,
        platform: 'web',
        canonicalFields: !!opts?.id,
      })

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
            `${descendantRules.get(descendant.selector) ?? ''}${descendant.cssProp}:${serializeCssValue(descendant.cssProp, cssValue)};`,
          )
          continue
        }
        // An alpha-capable colour routes through relative colour syntax with
        // its non-inheriting parameter, so `.bgColor$50` (or an inline
        // parameter) can wash it without a token x alpha rule explosion.
        if (alphaChannel?.includes(cssProp) && alphaWrappable(cssValue)) {
          alphaProps.add(cssProp)
          // Keep an ordinary color when the browser cannot parse relative
          // colors. color-mix preserves source alpha and the modifier on
          // browsers that support it; RCS remains the final modern value.
          const property = camelToKebab(cssProp)
          const plain = serializeCssValue(cssProp, cssValue)
          cssRule += `${property}:${plain};`
          cssRule += `${property}:color-mix(in oklab, ${plain} calc(var(${alphaVarName(cssProp)}, 1) * 100%), transparent);`
          cssValue = withAlphaExpr(cssValue, `var(${alphaVarName(cssProp)}, 1)`)
        }
        cssRule += `${camelToKebab(cssProp)}:${serializeCssValue(cssProp, cssValue)};`
      }

      const ruleKey = `${key}_${value}`

      // The class NAME may contain characters that are valid in a class
      // attribute but meta-characters in a selector — `paddingX_0.5` needs to
      // be matched as `.paddingX_0\.5`. Escape the selector, not the name: the
      // runtime emits the unescaped form into className.
      const selector = ruleKey.replace(/[^a-zA-Z0-9_-]/g, (c) => `\\${c}`)

      if (cssRule) styles += `${scope}.${selector}{${cssRule}}`
      for (const [descSelector, body] of descendantRules) {
        styles += `${scope}.${selector} ${descSelector} {${body}}`
      }

      // PSEUDO-ELEMENT rules attached to this value's atomic class — the one
      // sanctioned pseudo-element channel (scrollbars, ::file-selector-button:
      // vendor surfaces that cannot be real elements). Web-only by nature:
      // they exist ONLY in this generated css, so a native binding sees the
      // class name and nothing else. Everything else stays real elements.
      const pseudoRules = (
        token as {
          pseudoRules?: (
            v: unknown,
            tokens: unknown,
          ) => Record<string, Record<string, unknown>> | undefined
        }
      ).pseudoRules
      if (pseudoRules) {
        const perPseudo = pseudoRules(value, tokens)
        if (perPseudo) {
          for (const pseudoSel in perPseudo) {
            let body = ''
            const props = perPseudo[pseudoSel]!
            for (const cssProp in props) {
              body += `${camelToKebab(cssProp)}:${serializeCssValue(cssProp, props[cssProp])};`
            }
            if (body) styles += `${scope}.${selector}${pseudoSel}{${body}}`
          }
        }
      }
    })
  }

  // Responsive atomic classes for the opted tokens (see `responsiveTokens` on
  // the declaration type): every enumerated value again, under each condition
  // the token declares (every condition for the legacy list; see
  // system/responsive.ts). Emitted AFTER the resting atomics so an
  // active breakpoint class beats the resting value by order at equal
  // specificity — and, unlike a chain, still loses to a caller's utilities.
  // Ascending width order so a larger breakpoint's block wins the same way;
  // raw media CONDITIONS ('(pointer: coarse)') sort last, as in the chains.
  if (responsive.size && breakpoints) {
    const px = (v: number | string): number =>
      typeof v === 'number'
        ? v
        : isMediaCondition(v)
          ? Number.POSITIVE_INFINITY
          : Number.parseFloat(v) *
            (v.endsWith('rem') || v.endsWith('em') ? 16 : 1)
    const sorted = Object.entries(
      breakpoints.__breakpoints as Record<string, number | string>,
    ).sort(([, a], [, b]) => px(a) - px(b))
    for (const [bpKey, bpValue] of sorted) {
      const condition = isMediaCondition(bpValue)
        ? bpValue
        : `(min-width: ${typeof bpValue === 'number' ? `${bpValue}px` : bpValue})`
      let block = ''
      for (const [key, conditions] of responsive) {
        if (conditions && !conditions.has(bpKey)) continue
        // oxlint-disable-next-line typescript/no-explicit-any -- same structural narrowing as the token loop
        const token = system[key] as any
        if (!token || !('values' in token) || !('resolve' in token)) continue
        // oxlint-disable-next-line typescript/no-explicit-any -- token values are dynamically typed
        token.values.forEach((value: any) => {
          if (value instanceof Number || value instanceof String) return
          const result = resolveConfiguredToken(token, value, tokens, {
            ...layout,
            platform: 'web',
            canonicalFields: !!opts?.id,
          })
          if (!result) return
          const fields = collapseSides(result)
          let cssRule = ''
          for (const cssProp in fields) {
            cssRule += `${camelToKebab(cssProp)}:${serializeCssValue(cssProp, fields[cssProp])};`
          }
          if (!cssRule) return
          const ruleKey = `@${bpKey}:${key}_${value}`
          const selector = ruleKey.replace(/[^a-zA-Z0-9_-]/g, (c) => `\\${c}`)
          block += `${scope}.${selector}{${cssRule}}`
        })
      }
      if (block) styles += `@media ${condition} {${block}}`
    }
  }

  // `inherits: false` is load-bearing: an unregistered custom property
  // inherits, and a parent's wash would cascade onto every descendant's colour.
  for (const prop of alphaProps) {
    styles += `@property ${alphaVarName(prop)} {syntax:'<number>';inherits:false;initial-value:1;}`
  }
  styles += alphaClasses

  return opts?.id
    ? namespaceCss(styles, opts.id, { scope: opts.scope, externalCssVariables })
    : styles
}
