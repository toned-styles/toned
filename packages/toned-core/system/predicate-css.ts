import { atomSlug, parseConditionKey } from '../utils/conditions.ts'
import type { QueryPredicate } from './queries.ts'

export const CONDITIONAL_RULES = Symbol.for('@toned/conditionalRules')
export type ConditionalRule = {
  predicate: QueryPredicate
  style: Record<string, unknown>
  part: string
  order: number
}

/** Compile an AST to custom-property guards without exponential DNF expansion.
 * A true guard is valid whitespace; a false guard is guaranteed-invalid. AND
 * concatenates guards and OR uses fallback substitution on intermediate vars. */
export function compilePredicateGuard(
  predicate: QueryPredicate,
  target: string,
  prefix: string,
  parameters: Record<string, unknown>,
): string {
  let counter = 0
  const visit = (node: QueryPredicate, negate = false): string => {
    if (node.op === 'not') return visit(node.operand, !negate)
    if (node.op === 'atom') {
      const key = node.key
      if (key.startsWith('@platform'))
        throw new Error(
          'Toned: platform predicates must be resolved before CSS compilation',
        )
      if (key.startsWith('@')) {
        const expr = parseConditionKey(key.slice(1))
        if (!expr || expr.length !== 1 || expr[0]?.length !== 1)
          throw new Error(
            `Toned: expected a finite condition atom, received ${key}`,
          )
        const atom = expr[0]![0]!
        return `var(--${atomSlug(atom)}${negate !== atom.negated ? '-not' : ''})`
      }
      const separator = key.indexOf(':')
      if (separator < 0)
        throw new Error(`Toned: unsupported CSS predicate ${key}`)
      const part = key.slice(0, separator)
      if (part && part !== target)
        throw new Error(
          `Toned: cross-part predicate ${key} requires the controller's part-state registry`,
        )
      return `var(--toned_${key.slice(separator + 1)}${negate ? '-not' : ''})`
    }
    const op = negate ? (node.op === 'all' ? 'any' : 'all') : node.op
    const operands = node.operands.map((operand) => visit(operand, negate))
    const name = `--toned-predicate-${prefix}-${counter++}`
    if (op === 'all') parameters[name] = operands.join(' ') || ' '
    else {
      parameters['--toned-predicate-false'] = 'initial'
      let fallback = 'var(--toned-predicate-false)'
      // Each operand gets a named guard. A failed conjunction is then eligible
      // for var() fallback, rather than poisoning the whole OR expression.
      for (let i = operands.length - 1; i >= 0; i--) {
        const operandName = `${name}-${i}`
        parameters[operandName] = operands[i]
        fallback = `var(${operandName}, ${fallback})`
      }
      parameters[name] = fallback
    }
    return `var(${name})`
  }
  return visit(predicate)
}
