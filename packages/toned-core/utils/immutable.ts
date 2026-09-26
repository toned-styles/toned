import { isGrid, isGridArea } from '../grid/index.ts'
import { isWebRules } from '../web/rules.ts'

// Only our own recursively immutable outputs qualify. Object.isFrozen(input)
// says nothing about caller-owned children, and opaque values may stay mutable.
const snapshots = new WeakSet<object>()
export const isImmutableValue = (value: unknown): boolean =>
  value === null ||
  (typeof value !== 'object' && typeof value !== 'function') ||
  snapshots.has(value as object)

/** Internal escape hatch for a locally constructed immutable opaque reference
 * (the CSS-variable token proxy). Never use on caller-owned opaque values. */
export function certifyImmutableReference<T extends object>(value: T): T {
  snapshots.add(value)
  return value
}

/** Internal cache eligibility; a frozen caller-owned root alone is insufficient. */
export const isImmutableSnapshot = (value: object): boolean =>
  snapshots.has(value)

/** Snapshot declaration data without altering opaque runtime values or functions. */
export function immutableSnapshot<T>(value: T): T {
  if (!value || typeof value !== 'object' || snapshots.has(value)) return value
  // These immutable references identify a layout owner; cloning changes meaning.
  if (isGrid(value) || isGridArea(value) || isWebRules(value)) return value
  const array = Array.isArray(value)
  if (!array && Object.getPrototypeOf(value) !== Object.prototype) return value
  // Array subclasses/custom mapping may produce additional opaque state.
  let immutable =
    !array ||
    (Object.getPrototypeOf(value) === Array.prototype &&
      !Object.hasOwn(value, 'constructor') &&
      !Object.hasOwn(value, 'map'))
  const copy = (member: unknown) => {
    const result = immutableSnapshot(member)
    if (!isImmutableValue(result)) immutable = false
    return result
  }
  const result = Object.freeze(
    array
      ? value.map(copy)
      : Object.fromEntries(
          Object.entries(value).map(([key, member]) => [key, copy(member)]),
        ),
  )
  if (immutable) snapshots.add(result)
  return result as T
}
