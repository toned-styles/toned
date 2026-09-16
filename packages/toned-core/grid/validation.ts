import type { DeclarationOperation } from '../core/plan.ts'
import { declarationLayers } from '../stylesheet/removals.ts'
import { isGrid, isGridArea, sameGridFamily } from './index.ts'

const registrations = new WeakMap<
  object,
  Readonly<Record<string, Readonly<Record<string, unknown>>>>
>()

/** Effective unconditional layout ownership after platform selection and removals.
 * Geometry stays in the ordered plan; host registration needs only the final
 * opaque references, including registrations introduced by an override layer. */
export function gridRegistrations(rules: Readonly<Record<string, unknown>>) {
  let result = registrations.get(rules)
  if (!result) {
    const parts: Record<string, Record<string, unknown>> = Object.create(null)
    for (const layer of declarationLayers(rules)) {
      for (const [part, value] of Object.entries(layer)) {
        if (
          !value ||
          typeof value !== 'object' ||
          ['@', '[', ':', '$'].includes(part[0]!) ||
          part.includes(':')
        )
          continue
        for (const token of ['$grid', '$area']) {
          if (Object.hasOwn(value, token)) {
            const registration = parts[part] ?? {}
            parts[part] = registration
            registration[token] = (value as Record<string, unknown>)[token]
          }
        }
      }
    }
    result = Object.freeze(
      Object.fromEntries(
        Object.entries(parts).map(([part, style]) => [
          part,
          Object.freeze(style),
        ]),
      ),
    )
    registrations.set(rules, result)
  }
  return result
}

/** Browser predicates change geometry, never the mounted ownership boundary.
 * An unconditional registration keeps ref attachment independent of media/state.
 */
export function validateGridDeclarations(
  rules: Readonly<Record<string, unknown>>,
  extensions: readonly DeclarationOperation[],
): void {
  if (
    !extensions.some(
      (operation) => operation.token === '$grid' || operation.token === '$area',
    )
  )
    return
  const registered = gridRegistrations(rules)
  for (const operation of extensions) {
    if (operation.token !== '$grid' && operation.token !== '$area') continue
    // Earlier unconditional occurrences may be superseded by another layer.
    // The effective unconditional registration is the ownership boundary.
    if (
      operation.predicate.op === 'all' &&
      operation.predicate.operands.length === 0
    )
      continue
    const part = registered[operation.origin.part] as
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
