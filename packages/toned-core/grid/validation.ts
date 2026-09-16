import type { DeclarationOperation } from '../core/plan.ts'
import { isGrid, isGridArea, sameGridFamily } from './index.ts'

/** Browser predicates change geometry, never the mounted ownership boundary.
 * An unconditional registration keeps ref attachment independent of media/state.
 */
export function validateGridDeclarations(
  rules: Readonly<Record<string, unknown>>,
  extensions: readonly DeclarationOperation[],
): void {
  for (const operation of extensions) {
    if (operation.token !== '$grid' && operation.token !== '$area') continue
    const part = rules[operation.origin.part] as
      | Record<string, unknown>
      | undefined
    const registration = part?.[operation.token]
    const current = operation.value
    const base = isGrid(registration)
      ? registration
      : isGridArea(registration)
        ? registration.grid
        : undefined
    const next = isGrid(current)
      ? current
      : isGridArea(current)
        ? current.grid
        : undefined
    if (!base || !next || !sameGridFamily(base, next))
      throw new Error(
        `Toned grid ${operation.origin.part}: ${operation.token} needs an unconditional registration from the same grid family; use grid.variant(...) for responsive layouts`,
      )
  }
}
