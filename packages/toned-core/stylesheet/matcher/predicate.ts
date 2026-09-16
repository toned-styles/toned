import type { QueryPredicate } from '../../system/queries.ts'
import { relationFactKey } from '../relations.ts'
import type { BitSet, CompiledPredicate } from './bitset.ts'
import { matchesBits } from './bitset.ts'
import { type Conditions, parseVariantSelector } from './normalizeRules.ts'

export type PredicatePlan =
  | { readonly op: 'constant'; readonly value: boolean }
  | { readonly op: 'fact'; readonly mask: CompiledPredicate }
  | { readonly op: 'css'; readonly predicate: QueryPredicate }
  | { readonly op: 'all' | 'any'; readonly operands: readonly PredicatePlan[] }
  | { readonly op: 'not'; readonly operand: PredicatePlan }

/** Linear in AST size; preserves boolean structure instead of expanding DNF. */
export function compilePredicate(
  query: QueryPredicate,
  options: {
    cssMediaMode: boolean
    cssPseudoMode: boolean
    platform: 'web' | 'native'
    part: string
  },
  compileMask: (conditions: Conditions) => CompiledPredicate,
): PredicatePlan {
  if (query.op === 'relation')
    return {
      op: 'fact',
      mask: compileMask(new Map([[relationFactKey(query.relation), ['true']]])),
    }
  if (query.op === 'not')
    return {
      op: 'not',
      operand: compilePredicate(query.operand, options, compileMask),
    }
  if (query.op !== 'atom')
    return {
      op: query.op,
      operands: query.operands.map((child) =>
        compilePredicate(child, options, compileMask),
      ),
    }
  const key = query.key
  if (key.startsWith('@platform.'))
    return { op: 'constant', value: key === `@platform.${options.platform}` }
  if (key[0] === '[')
    return { op: 'fact', mask: compileMask(parseVariantSelector(key)) }
  if (
    (key[0] === '@' && options.cssMediaMode) ||
    (key.startsWith(`${options.part}:`) && options.cssPseudoMode)
  ) {
    return { op: 'css', predicate: query }
  }
  return { op: 'fact', mask: compileMask(new Map([[key, ['true']]])) }
}

/** Resolve known runtime facts; retain browser facts for the CSS backend. */
export function evaluatePredicate(
  plan: PredicatePlan,
  state: BitSet,
): boolean | QueryPredicate {
  if (plan.op === 'constant') return plan.value
  if (plan.op === 'css') return plan.predicate
  if (plan.op === 'fact') return matchesBits(state, plan.mask)
  if (plan.op === 'not') {
    const value = evaluatePredicate(plan.operand, state)
    return typeof value === 'boolean' ? !value : { op: 'not', operand: value }
  }
  const operands: QueryPredicate[] = []
  for (const child of plan.operands) {
    const value = evaluatePredicate(child, state)
    if (typeof value === 'boolean') {
      if (plan.op === 'all' && !value) return false
      if (plan.op === 'any' && value) return true
    } else operands.push(value)
  }
  if (!operands.length) return plan.op === 'all'
  if (operands.length === 1) return operands[0]!
  return { op: plan.op, operands }
}
