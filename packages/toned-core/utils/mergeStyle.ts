/**
 * Style-object merge helper.
 *
 * @module utils/mergeStyle
 */

// biome-ignore lint/suspicious/noExplicitAny: style objects hold dynamic CSS values
type AnyValue = any

function isStyleObject(value: unknown): value is Record<string, AnyValue> {
  return typeof value === 'object' && value !== null
}

/**
 * Merge two `style` objects one level deep, with `source` keys overriding
 * `target` keys. This is the single source of truth for how layered styles
 * (compiled rules in `StyleMatcher.match`, `t()` arguments) combine, so a later
 * layer extends — rather than replaces — an earlier one.
 *
 * `null`/`undefined` operands pass through, so a missing `style` never wipes an
 * existing one. When either operand is a non-object the source wins (there is
 * nothing to merge).
 *
 * Note: this is intentionally a one-level merge — CSS `style` maps are flat, so
 * a later rule can override individual properties but cannot deep-clear a
 * nested value set by an earlier rule.
 */
export function mergeStyle(target: unknown, source: unknown): AnyValue {
  if (target == null) return source
  if (source == null) return target
  if (isStyleObject(target) && isStyleObject(source)) {
    return { ...target, ...source }
  }
  return source
}
