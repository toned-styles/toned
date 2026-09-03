import { defineUnit } from '@toned/core'

// TODO: move to configuration level
// biome-ignore lint/complexity/noBannedTypes: instance is expected
export const SpaceUnit = defineUnit<Number | String>((value, tokens) => {
  // @ts-expect-error
  const base = tokens.base

  if (typeof value === 'string') {
    return tokens[`space_${value}`]
  }

  return String(base).startsWith('var')
    ? `calc(${base} * ${Number(value)})`
    : Number(value) * Number.parseInt(String(base), 10)
})
