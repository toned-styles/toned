import { type Predicate, queryPredicate } from '../../core/predicates.ts'
import type { QueryPredicate } from '../../system/queries.ts'
import type { QueryKey } from '../../system/query-key.ts'
import { compileCssPredicateGuard } from './plan.ts'

export {
  CONDITIONAL_RULES,
  type ConditionalRule,
} from '../../stylesheet/rule-protocol.ts'

/** Compatibility spelling adapter; shared semantic lowering owns the guards. */
export function compilePredicateGuard(
  predicate: QueryPredicate | QueryKey,
  target: string,
  prefix: string,
  parameters: Record<string, unknown>,
): string {
  const bindPart = (node: Predicate): Predicate => {
    if (node.op === 'atom')
      return node.fact.kind === 'state' && node.fact.part === ''
        ? { op: 'atom', fact: { ...node.fact, part: target } }
        : node
    return node.op === 'not'
      ? { op: 'not', operand: bindPart(node.operand) }
      : { op: node.op, operands: node.operands.map(bindPart) }
  }
  return compileCssPredicateGuard(
    bindPart(queryPredicate(predicate)),
    target,
    prefix,
    parameters,
  )
}
