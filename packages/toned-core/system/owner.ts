/**
 * The system a stylesheet belongs to. A target view (`withTargets`) shares its
 * system's sheets, renderers and build output, so wherever a sheet's owner is
 * compared, a view stands for the system it was made from.
 *
 * @module system/owner
 */

const OWNER = Symbol.for('toned.system.owner')

/** Marks `view` as a view of `system` (or of the system `system` views). */
export function markView<V extends object>(view: V, system: object): V {
  Object.defineProperty(view, OWNER, { value: ownerOf(system) })
  return view
}

/** The system that owns the sheets made through `system`: itself, or the system a view was made from. */
export function ownerOf(system: object): object {
  return (system as { [OWNER]?: object })[OWNER] ?? system
}
