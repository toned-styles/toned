import {
  type CompiledPlan,
  compileRules,
  type Predicate,
} from '@toned/core/core'
import type { Base } from '@toned/core/stylesheet'

type Controller = Pick<Base, 'ref' | 'rules' | 'config'>
const requirements = new WeakMap<CompiledPlan, ReadonlyMap<string, string>>()

function scopeRequirements(plan: CompiledPlan): ReadonlyMap<string, string> {
  const cached = requirements.get(plan)
  if (cached) return cached
  const result = new Map<string, string>()
  const require = (part: string, reason: string) => {
    if (!result.has(part)) result.set(part, reason)
  }
  const visit = (predicate: Predicate, target: string): void => {
    if (predicate.op === 'not') {
      visit(predicate.operand, target)
    } else if (predicate.op !== 'atom') {
      for (const operand of predicate.operands) visit(operand, target)
    } else if (predicate.fact.kind === 'relation') {
      const { sourcePart, part } = predicate.fact.relation
      const reason = `the relationship between ${sourcePart} and ${part}`
      require(sourcePart, reason)
      require(part, reason)
      require(target, reason)
    } else if (predicate.fact.kind === 'state') {
      // Legacy sibling channels spell their source as "Part~". Local state
      // facts (including bare q.state predicates) need no shared controller.
      const source = predicate.fact.part.replace(/~$/, '')
      if (source && source !== target) {
        const reason = `state shared between ${source} and ${target}`
        require(source, reason)
        require(target, reason)
      }
    }
  }
  for (const operation of [...plan.operations, ...plan.extensions]) {
    // A leaf tombstone can leave an empty raw-style container in the plan.
    // That writes no fields and therefore has no shared-state dependency.
    if (
      (operation.token === '$style' || operation.token === 'style') &&
      Object.keys((operation.value ?? {}) as object).length === 0
    )
      continue
    const part = operation.origin.part
    visit(operation.predicate, part)
    // Layout ownership is an explicit createElements boundary even though a
    // browser grid can otherwise connect hosts through their DOM parent alone.
    if (operation.token === '$grid' || operation.token === '$area')
      require(part, `${operation.token} layout ownership`)
  }
  requirements.set(plan, result)
  return result
}

/** A structural contract, independent of selected variants or current states.
 * Inspect the same platform-specialized, override-aware plan as execution.
 * Sources must join the scope too: otherwise the target never receives facts.
 */
export function standaloneScopeRequirement(
  controller: Controller,
  part: string,
): string | undefined {
  const plan = compileRules(
    controller.ref,
    controller.rules,
    controller.config.platform ?? 'web',
  )
  return scopeRequirements(plan).get(part)
}

export function assertStandalonePart(
  controller: Controller,
  part: string,
): void {
  const reason = standaloneScopeRequirement(controller, part)
  if (!reason) return
  const error = new Error(
    `Toned: ${part} requires its createElements scope for ${reason}; wrap related parts in their <S> provider.`,
  )
  error.name = 'TonedMissingScopeError'
  throw error
}
