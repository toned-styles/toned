import { defineCssToken } from '../defineCssToken.ts'
import { SpaceUnit } from './unit.ts'

/*
 * Dimensions are base-relative like every numeric sizing value in the system:
 * `maxWidth: 8` is twice `maxWidth: 4`, whatever --base is. The common steps
 * are enumerated as literals so static generation emits an atomic class for
 * each (an off-scale number, a percentage or calc() string still resolves
 * dynamically); 'auto' and '100%' are enumerated too — they are the two
 * non-numeric values components reach for constantly.
 */
const sizeValues = [
  new Number(),
  new String(),
  'auto',
  '100%',
  'fit-content',
  'max-content',
  0,
  0.5,
  1,
  1.5,
  2,
  2.5,
  3,
  3.5,
  4,
  5,
  6,
  7,
  8,
  9,
  10,
  11,
  12,
  14,
  16,
  20,
  24,
  28,
  32,
  36,
  40,
  44,
  48,
  56,
  64,
  72,
  80,
  96,
] as const

// Dimension literals are CSS values, not names in the spacing dictionary.
// Leave them intact so the web serializer can emit them and the native
// backend can reject web-only units/expressions rather than silently omit them.
const cssLength =
  /^-?(?:\d+\.?\d*|\.\d+)(?:%|px|em|rem|ex|rex|cap|rcap|ch|rch|ic|ric|lh|rlh|cm|mm|q|in|pt|pc|[sld]?(?:vw|vh|vi|vb|vmin|vmax)|cq(?:w|h|i|b|min|max))$/i
const cssDimensionExpression = /^(?:calc|min|max|clamp|var|env|fit-content)\(/

const SizeUnit = (
  value: Parameters<typeof SpaceUnit>[0],
  tokens: Parameters<typeof SpaceUnit>[1],
) =>
  value === 'auto' ||
  value === '100%' ||
  value === 'fit-content' ||
  value === 'max-content' ||
  (typeof value === 'string' &&
    (cssLength.test(value) || cssDimensionExpression.test(value)))
    ? String(value)
    : SpaceUnit(value, tokens)

export const minWidth = defineCssToken('minWidth', sizeValues, SizeUnit)
export const maxWidth = defineCssToken('maxWidth', sizeValues, SizeUnit)
export const width = defineCssToken('width', sizeValues, SizeUnit)
export const height = defineCssToken('height', sizeValues, SizeUnit)
export const minHeight = defineCssToken('minHeight', sizeValues, SizeUnit)
export const maxHeight = defineCssToken('maxHeight', sizeValues, SizeUnit)
