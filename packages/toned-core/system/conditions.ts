/**
 * The ergonomic face of the condition model (utils/conditions.ts): builders
 * that SERIALIZE TO CANONICAL STRING KEYS — the same trick the variant `$`
 * builder uses — so a stylesheet writes
 *
 *   [cq('field-group').min('25rem')]: { flexLayout: 'row' },
 *   [not(cq('card').min(400))]: { display: 'none' },
 *   [and(bp('md'), cq('card').min('30rem'))]: { … },
 *
 * and the object key IS the canonical `'@…'` spelling — hand-writable,
 * greppable, and identical across platforms. `below(x)` is `not(min(x))`:
 * the comparison surface is min-width plus algebra, nothing else.
 *
 * Combinators normalize to DNF at build time, so the core only ever parses
 * the flat `|`/`&`/`!` grammar.
 *
 * @module system/conditions
 */

import {
  parseConditionKey,
  serializeExpr,
  type ConditionAtom,
  type ConditionExpr,
} from '../utils/conditions.ts'

const SYMBOL_EXPR = Symbol.for('@toned/core/CONDITION_EXPR')

/** A condition node: carries its DNF and serializes to the `@…` key. */
export type Condition = {
  readonly [SYMBOL_EXPR]: ConditionExpr
  toString(): `@${string}`
}

function node(expr: ConditionExpr): Condition {
  const key: `@${string}` = `@${serializeExpr(expr)}`
  return {
    [SYMBOL_EXPR]: expr,
    toString: () => key,
    [Symbol.toPrimitive]: () => key,
  } as Condition
}

function exprOf(c: Condition | string): ConditionExpr {
  if (typeof c === 'string') {
    const parsed = parseConditionKey(c[0] === '@' ? c.slice(1) : c)
    if (!parsed) throw new Error(`not a condition key: ${JSON.stringify(c)}`)
    return parsed
  }
  return c[SYMBOL_EXPR]
}

const atom = (a: ConditionAtom): Condition => node([[a]])

/** A declared viewport breakpoint as a condition atom: `bp('md')` → `'@md'`. */
export function bp(name: string): Condition {
  return atom({ container: null, step: name, min: null, negated: false })
}

/**
 * A declared container's condition builder. The name must be declared in the
 * system's `containers`; the VALUES are free at the use site.
 */
export function cq(name: string): {
  /** width >= the given length (numbers are px). */
  min(length: number | string): Condition
  /** width < the given length — canonicalized as `not(min(length))`. */
  below(length: number | string): Condition
  /** A declared step of this container: `cq('field-group').step('md')`. */
  step(step: string): Condition
} {
  return {
    min: (length) =>
      atom({ container: name, step: null, min: length, negated: false }),
    below: (length) =>
      atom({ container: name, step: null, min: length, negated: true }),
    step: (step) => atom({ container: name, step, min: null, negated: false }),
  }
}

/** True when every given condition holds — clauses multiply out to DNF. */
export function and(...conditions: [Condition | string, ...Array<Condition | string>]): Condition {
  let acc: ConditionExpr = [[]]
  for (const c of conditions) {
    const expr = exprOf(c)
    const next: ConditionExpr = []
    for (const partial of acc) {
      for (const clause of expr) {
        next.push([...partial, ...clause])
      }
    }
    acc = next
  }
  return node(acc)
}

/** True when any given condition holds — OR is concatenation of clauses. */
export function or(...conditions: [Condition | string, ...Array<Condition | string>]): Condition {
  return node(conditions.flatMap((c) => exprOf(c)))
}

/**
 * True when the condition does not hold. De Morgan over the DNF, normalized
 * back to DNF: the clauses of the result pick one negated atom from each
 * original clause. Tiny inputs in practice; the expansion is exact.
 */
export function not(condition: Condition | string): Condition {
  const expr = exprOf(condition)
  let acc: ConditionExpr = [[]]
  for (const clause of expr) {
    const next: ConditionExpr = []
    for (const partial of acc) {
      for (const a of clause) {
        next.push([...partial, { ...a, negated: !a.negated }])
      }
    }
    acc = next
  }
  return node(acc)
}
