/**
 * CSS generation utilities.
 *
 * @module dom/generate
 */

import type { TokenStyleDeclaration } from '../types/index.ts'
import { camelToKebab, withCssUnit } from '../utils/css.ts'
import { PSEUDO_STATES } from '../utils/pseudo.ts'

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

  let rootRule = ''
  let rules = ''

  // Pseudo-state toggles first, and unconditionally: `pseudoMode: 'css'` reads
  // them whether or not the system declares any breakpoints.
  for (const pseudo of PSEUDO_STATES) {
    const name = `--toned_${pseudo.slice(1)}`
    rootRule += `${name}: initial;`
    // make it work as expected with nested elements
    rules += `._${pseudo} {${name}: ;} ._${pseudo} ._ {${name}: initial;} ._${pseudo} ._${pseudo} {${name}: ;}`
  }

  if (breakpoints) {
    for (const [key, value] of Object.entries(breakpoints.__breakpoints)) {
      const varName = `--media-${camelToKebab(key).replace('@', '')}`

      rootRule += `${varName}: initial;`
      rules += `@media (min-width: ${value}px) { html { ${varName}: ; } }`
    }
  }

  styles += `html {${rootRule}}`
  styles += rules

  // handle custom tokens

  for (const key in system) {
    const token = system[key]

    // Skip non-token entries (like breakpoints)
    if (!token || !('values' in token) || !('resolve' in token)) continue

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
        // Same unit rule as the runtime path: a resolver may return a bare
        // number, and a static rule has no later step that would suffix it.
        cssRule += `${camelToKebab(cssProp)}:${withCssUnit(cssProp, result[cssProp])};`
      }

      const ruleKey = `${key}_${value}`

      cssRule = `.${ruleKey}{${cssRule}}`

      styles += cssRule
    })
  }

  return styles
}
