import { defineUnit } from '@toned/core'

// oxlint-disable-next-line typescript/no-wrapper-object-types -- accepts boxed values as well as primitives; both are coerced below.
export const SpaceUnit = defineUnit<Number | String>((value, tokens) => {
  const base = tokens['base']

  if (typeof value === 'string') {
    return tokens[`space_${value}`]
  }

  return String(base).startsWith('var')
    ? `calc(${base} * ${Number(value)})`
    : Number(value) * Number.parseInt(String(base), 10)
})

// Dimension literals are CSS values, not names in the spacing dictionary.
// Leave them intact so the web serializer can emit them and the native
// backend can reject web-only units/expressions rather than silently omit them.
const cssLength =
  /^-?(?:\d+\.?\d*|\.\d+)(?:%|px|em|rem|ex|rex|cap|rcap|ch|rch|ic|ric|lh|rlh|cm|mm|q|in|pt|pc|[sld]?(?:vw|vh|vi|vb|vmin|vmax)|cq(?:w|h|i|b|min|max))$/i
const cssDimensionExpression = /^(?:calc|min|max|clamp|var|env|fit-content)\(/

/** A CSS length, percentage or dimension expression, as opposed to a spacing alias. */
export const isCssDimension = (value: unknown): value is string =>
  typeof value === 'string' &&
  (cssLength.test(value) || cssDimensionExpression.test(value))
