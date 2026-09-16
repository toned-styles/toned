import { isGrid, isGridArea } from '../grid/index.ts'

/** Snapshot declaration data without altering opaque runtime values or functions. */
export function immutableSnapshot<T>(value: T): T {
  // These immutable references identify a layout owner; cloning changes meaning.
  if (isGrid(value) || isGridArea(value)) return value
  if (Array.isArray(value)) return Object.freeze(value.map(immutableSnapshot)) as T
  if (value && typeof value === 'object' && Object.getPrototypeOf(value) === Object.prototype)
    return Object.freeze(
      Object.fromEntries(
        Object.entries(value).map(([key, member]) => [key, immutableSnapshot(member)]),
      ),
    ) as T
  return value
}
