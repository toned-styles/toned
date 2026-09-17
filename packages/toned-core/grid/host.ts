import type { GridArea, GridDefinition } from './index.ts'
import { createGridScope, sameGridFamily } from './index.ts'

export interface GridHostElement {
  parentElement: GridHostElement | null
  children: ArrayLike<GridHostElement>
}
type Binding = {
  grid?: GridDefinition
  area?: GridArea
  scope?: ReturnType<typeof createGridScope>
  detachArea?: () => void
}
const bindings = new WeakMap<GridHostElement, Binding>()

function connect(element: GridHostElement, strict: boolean): void {
  const binding = bindings.get(element)
  if (!binding?.area) return
  const parent = element.parentElement && bindings.get(element.parentElement)
  if (!parent?.scope || !sameGridFamily(parent.scope.grid, binding.area.grid)) {
    binding.detachArea?.()
    delete binding.detachArea
    if (strict) {
      if (parent?.scope)
        throw new Error(
          `Toned grid ${binding.area.grid.id}: area ${binding.area.name} belongs to another grid definition`,
        )
      throw new Error(
        `Toned grid ${binding.area.grid.id}: area ${binding.area.name} needs a direct parent with its $grid; a wrapper or portal is not a grid item`,
      )
    }
    return // React publishes child refs before a replaced parent's ref.
  }
  binding.detachArea?.()
  binding.detachArea = parent.scope.attach(element, binding.area)
}

/** Attach during host ref publication; validate after all commit refs attach. */
export function attachGridElement(
  element: GridHostElement,
  metadata: { grid?: GridDefinition; area?: GridArea },
  invalidate?: (target: GridHostElement) => void,
): () => void {
  const previous = bindings.get(element)
  previous?.detachArea?.()
  const binding: Binding = {
    ...metadata,
    ...(metadata.grid ? { scope: createGridScope(metadata.grid) } : {}),
  }
  bindings.set(element, binding)
  connect(element, false)
  for (const child of Array.from(element.children)) connect(child, false)
  return () => {
    if (bindings.get(element) !== binding) return
    binding.detachArea?.()
    bindings.delete(element)
    for (const child of Array.from(element.children)) {
      const childBinding = bindings.get(child)
      childBinding?.detachArea?.()
      if (childBinding) delete childBinding.detachArea
      if (childBinding?.area) invalidate?.(child)
    }
  }
}

/** Call in the host's layout commit, never during speculative rendering. */
export function validateGridElement(element: GridHostElement): void {
  connect(element, true)
  // A parent host can be replaced/reconfigured while its child refs remain
  // stable. Validate those immediate ownership edges without scanning any
  // unrelated mounted parts or walking arbitrary descendant subtrees.
  for (const child of Array.from(element.children)) connect(child, true)
}
