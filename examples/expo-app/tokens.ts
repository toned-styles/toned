import shadcn from '@toned/themes/shadcn'

type Name = keyof typeof shadcn

/**
 * The shadcn theme is written for CSS: values refer to other custom properties
 * and lengths carry `px`. The native renderer takes concrete values, so follow
 * each `var(--name)` reference and turn pixel lengths into numbers. Values
 * without a native meaning (such as `rem` type sizes) stay as they are, and
 * the native renderer rejects them if a stylesheet uses them.
 */
function concrete(value: string | number): string | number {
  if (typeof value === 'number') return value
  const reference = /^var\(--(\w+)\)$/.exec(value)?.[1]
  if (reference && reference in shadcn)
    return concrete(shadcn[reference as Name])
  const pixels = /^(-?\d*\.?\d+)px$/.exec(value)?.[1]
  return pixels === undefined ? value : Number(pixels)
}

export const tokens = Object.freeze(
  Object.fromEntries(
    Object.entries(shadcn).map(([name, value]) => [name, concrete(value)]),
  ),
)
