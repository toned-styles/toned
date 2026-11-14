import { unitlessNumbers } from '../stylesheet/unitlessNumbers.ts'
import { camelToKebab } from './css.ts'

const unitlessFields = new Set([
  ...unitlessNumbers,
  ...[...unitlessNumbers].map(camelToKebab),
  'WebkitBoxFlexGroup',
])

/** The same numeric contract as React DOM styles: dimensions are CSS pixels,
 * unitless fields and custom parameters retain numbers, explicit units stay intact.
 * Call only at a CSS output boundary; native resolver values remain numbers. */
export function serializeCssValue(property: string, value: unknown): string {
  if (value == null) return ''
  if (
    typeof value === 'number' &&
    !property.startsWith('--') &&
    !unitlessFields.has(property)
  )
    return `${value}px`
  return String(value)
}

const CSS_WIDE_KEYWORDS = new Set([
  'inherit',
  'initial',
  'unset',
  'revert',
  'revert-layer',
])

/** `inherit`, `initial`, `unset`, `revert` or `revert-layer`. These work as a
 * whole declared value and as a `var()` fallback, but not as a value that
 * reaches a property through a custom property. */
export const isCssWideKeyword = (value: unknown): boolean =>
  typeof value === 'string' && CSS_WIDE_KEYWORDS.has(value.trim().toLowerCase())
