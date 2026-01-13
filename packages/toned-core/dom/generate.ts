/**
 * CSS generation utilities.
 *
 * @module dom/generate
 */

import type { TokenStyleDeclaration } from '../types/index.ts'
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

    const PSEUDO_STATES = ['hover', 'focus', 'active']

    let rootRule = ''
    let rules = ''

    PSEUDO_STATES.forEach((pseudo) => {
      const name = `--toned_${pseudo}`
      rootRule += `${name}: initial;`
      // make it work as expected with nested elements
      rules += `._:${pseudo} {${name}: ;} ._:${pseudo} ._ {${name}: initial;} ._:${pseudo} ._:${pseudo} {${name}: ;}`
    })

    for (const [key, value] of Object.entries(bpValues)) {
      const varName = `--media-${camelToKebab(key).replace('@', '')}`

      rootRule += `${varName}: initial;`
      rules += `@media (min-width: ${value}px) { ${varName}: ; }`
    }

    styles += `html {${rootRule}}`
    styles += rules
  }

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
        cssRule += `${camelToKebab(cssProp)}:${result[cssProp]};`
      }

      const ruleKey = `${key}_${value}`

      cssRule = `.${ruleKey}{${cssRule}}`

      styles += cssRule
    })
  }

  return styles
}
