/**
 * Style-map normalisation and merging.
 *
 * @module utils/mergeStyle
 */

// biome-ignore lint/suspicious/noExplicitAny: style objects hold dynamic CSS values
type AnyValue = any

/**
 * Normalise a raw `style` value into a single property map, or `undefined` when
 * it cannot be one.
 *
 * React Native accepts arrays — `style={[base, isActive && active]}` — where
 * later entries win and falsy entries are skipped. Collapsing them here gives
 * the same result and, more importantly, stops an array being spread by index
 * into properties called `"0"` and `"1"`.
 */
export function toStyleMap(
  value: unknown,
): Record<string, AnyValue> | undefined {
  if (Array.isArray(value)) {
    return Object.assign(
      {},
      ...value.flat(Number.POSITIVE_INFINITY).filter(Boolean),
    )
  }

  return typeof value === 'object' && value !== null
    ? (value as Record<string, AnyValue>)
    : undefined
}

/**
 * Merge two `style` values one level deep, with `source` keys overriding
 * `target` keys. This is the single source of truth for how layered styles
 * (compiled rules in `StyleMatcher.match`, `t()` arguments) combine, so a later
 * layer extends — rather than replaces — an earlier one.
 *
 * `null`/`undefined` operands pass through, so a missing `style` never wipes an
 * existing one. When either operand cannot be a style map the source wins
 * (there is nothing to merge).
 *
 * Note: this is intentionally a one-level merge — CSS `style` maps are flat, so
 * a later rule can override individual properties but cannot deep-clear a
 * nested value set by an earlier rule.
 */
export function mergeStyle(target: unknown, source: unknown): AnyValue {
  if (target == null) return source
  if (source == null) return target

  const base = toStyleMap(target)
  const next = toStyleMap(source)
  if (base && next) return { ...base, ...next }

  return source
}
