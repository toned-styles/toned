import type { CompiledPlan, Predicate } from '../core/plan.ts'

/** Document renderers cannot defer browser facts or CSS effects to a host. */
export function assertStaticPlan(plan: CompiledPlan, label: string): void {
  if (plan.requiredExtensions.length)
    throw new Error(
      `Toned ${label} backend: CSS extensions require a browser stylesheet`,
    )
  const visit = (predicate: Predicate): void => {
    if (predicate.op === 'atom') {
      if (predicate.fact.kind !== 'variant')
        throw new Error(
          `Toned ${label} backend: unsupported ${predicate.fact.kind} condition`,
        )
    } else if (predicate.op === 'not') visit(predicate.operand)
    else for (const operand of predicate.operands) visit(operand)
  }
  for (const operation of plan.operations) visit(operation.predicate)
}
