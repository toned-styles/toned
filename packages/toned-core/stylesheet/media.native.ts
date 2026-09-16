import {
  evalExpr,
  fixedQueryWidth,
  parseConditionKey,
} from '../utils/conditions.ts'
import type { NativeHostAdapter } from './native-host.ts'

/** Native viewport facts use logical widths, never window.matchMedia or CSS parsing. */
export function connectNativeMedia(
  definitions: Readonly<Record<string, number | string>>,
  keys: readonly string[],
  adapter: NativeHostAdapter | undefined,
  notify: (state: Record<string, boolean>) => void,
): { state: Record<string, boolean>; stop: () => void } {
  const expressions = keys
    .filter((key) => key.startsWith('@'))
    .map((key) => ({ key, expression: parseConditionKey(key.slice(1)) }))
  const names = new Set<string>()
  for (const { expression } of expressions)
    for (const clause of expression ?? [])
      for (const atom of clause)
        if (atom.container === null) names.add(atom.step ?? `>=${atom.min}`)
  if (!names.size) return { state: {}, stop: () => {} }
  if (!adapter?.getViewportWidth || !adapter.subscribeViewport)
    throw new Error(
      'Toned: native media queries require nativeHost.getViewportWidth and subscribeViewport',
    )
  const thresholds = [...names].map((name) => {
    const value = fixedQueryWidth(name) ?? definitions[name]
    const width =
      typeof value === 'number'
        ? value
        : typeof value === 'string' && /^\d+(?:\.\d+)?px$/.test(value)
          ? Number(value.slice(0, -2))
          : NaN
    if (!Number.isFinite(width) || width < 0)
      throw new Error(
        `Toned: native media ${name} requires a numeric logical-width threshold; CSS lengths and raw queries need an explicit native declaration`,
      )
    return [name, width] as const
  })
  const read = () => {
    const width = adapter.getViewportWidth!()
    if (!Number.isFinite(width) || width < 0)
      throw new Error(
        'Toned: native viewport width must be finite and nonnegative',
      )
    const state: Record<string, boolean> = Object.fromEntries(
      thresholds.map(([name, min]) => [`@${name}`, width >= min]),
    )
    for (const { key, expression } of expressions)
      if (
        expression?.every((clause) =>
          clause.every((atom) => atom.container === null),
        )
      )
        state[key] = evalExpr(expression, {
          media: (name) => state[`@${name}`],
          containerPx: () => undefined,
          stepWidth: () => undefined,
          basePx: 1,
        })
    return state
  }
  let state = read()
  const stop = adapter.subscribeViewport(() => {
    const next = read()
    if (Object.keys(next).some((key) => next[key] !== state[key])) {
      state = next
      notify(next)
    }
  })
  // Subscribe first, then read once more to close the read/subscribe gap.
  try {
    state = read()
  } catch (error) {
    stop()
    throw error
  }
  return { state, stop }
}
