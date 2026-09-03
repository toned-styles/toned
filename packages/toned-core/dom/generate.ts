/**
 * CSS generation utilities.
 *
 * @module dom/generate
 */

import type { TokenStyleDeclaration } from '../types/index.ts'
import {
  DEFAULT_ALPHA_STEPS,
  alphaVarName,
  alphaWrappable,
  withAlphaExpr,
} from '../utils/alpha.ts'
import { camelToKebab } from '../utils/css.ts'

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
  ...system
}: S) {
  let styles = ''

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
      rules += pseudo === 'hover' ? `@media (hover: hover) {${toggles}}` : toggles
    })

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
    const token = system[key]

    // Skip non-token entries (like breakpoints)
    if (!token || !('values' in token) || !('resolve' in token)) continue

    const alphaChannel = (token as { alphaChannel?: readonly string[] }).alphaChannel
    if (alphaChannel) {
      const steps =
        (token as { alphaSteps?: readonly number[] }).alphaSteps ?? DEFAULT_ALPHA_STEPS
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

      const result = token.resolve(value, tokens)

      if (!result) return

      let cssRule = ''

      for (const cssProp in result) {
        let cssValue = result[cssProp]
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

      cssRule = `.${selector}{${cssRule}}`

      styles += cssRule
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
