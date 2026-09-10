/**
 * CSS utility functions.
 *
 * @module utils/css
 */

import { unitlessNumbers } from './unitlessNumbers.ts'

const camelToKebabRe = /([a-z0-9]|(?=[A-Z]))([A-Z])/g

/**
 * Convert camelCase to kebab-case.
 *
 * @example
 * ```ts
 * camelToKebab('backgroundColor') // 'background-color'
 * camelToKebab('WebkitTransform') // 'webkit-transform'
 * ```
 */
export function camelToKebab(str: string): string {
  return str.replace(camelToKebabRe, '$1-$2').toLowerCase()
}

/**
 * Apply the implicit `px` unit that a bare number carries in a style object.
 *
 * Style maps are shared between web and React Native, so a length is written as
 * a number — `{ padding: 8 }`. On web that only renders because whoever writes
 * the value appends `px`; `8` on its own is an invalid length. Anything that
 * turns a style value into CSS text has to apply the same rule, so it lives
 * here rather than at each of those points.
 *
 * Non-numbers pass through untouched, which covers values that already carry a
 * unit, `var()` chains, and keywords.
 *
 * @example
 * ```ts
 * withCssUnit('padding', 8)    // '8px'
 * withCssUnit('opacity', 0.5)  // 0.5   — unitless property
 * withCssUnit('padding', '1em') // '1em' — already has a unit
 * ```
 */
export function withCssUnit(cssProp: string, value: unknown): unknown {
  return typeof value === 'number' && !unitlessNumbers.has(cssProp)
    ? `${value}px`
    : value
}
