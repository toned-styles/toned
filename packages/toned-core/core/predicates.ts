import { parseVariantSelector } from '../stylesheet/matcher/normalizeRules.ts'
import { relationFactKey } from '../stylesheet/relations.ts'
import type { QueryPredicate } from '../system/queries.ts'
import { fixedQueryWidth, parseConditionKey } from '../utils/conditions.ts'

export type Fact =
  | { kind: 'variant'; axis: string; values: readonly string[] }
  | { kind: 'state'; part: string; name: string }
  | { kind: 'media'; name: string; min?: number }
  | {
      kind: 'container'
      name: string
      step?: string
      min?: number | string
      unit?: 'scale' | 'px'
    }
  | { kind: 'platform'; name: 'web' | 'native' }
  | {
      kind: 'relation'
      relation: {
        scope: 'child' | 'descendant'
        part: string
        state: string
        sourcePart: string
      }
    }

export type Predicate =
  | { op: 'atom'; fact: Fact }
  | { op: 'all' | 'any'; operands: readonly Predicate[] }
  | { op: 'not'; operand: Predicate }

export const TRUE: Predicate = Object.freeze({
  op: 'all',
  operands: Object.freeze([]),
})
export const FALSE: Predicate = Object.freeze({
  op: 'any',
  operands: Object.freeze([]),
})
export const atom = (fact: Fact): Predicate => ({ op: 'atom', fact })

/** Decode author-facing spelling once, at declaration compilation. */
export function conditionPredicate(
  key: string,
  values: readonly string[] = ['true'],
): Predicate {
  if (key.startsWith('@platform.')) {
    const name = key.slice(10)
    if (name !== 'web' && name !== 'native')
      throw new Error(`Toned: unknown platform ${name}`)
    return atom({ kind: 'platform', name })
  }
  if (key.startsWith('@')) {
    const expression = parseConditionKey(key.slice(1))
    if (!expression) throw new Error(`Toned: invalid condition ${key}`)
    return {
      op: 'any',
      operands: expression.map((clause) => ({
        op: 'all',
        operands: clause.map((item) => {
          const fact: Fact =
            item.container === null
              ? {
                  kind: 'media',
                  name: item.step ?? `>=${item.min}`,
                  ...(item.step === null
                    ? { min: fixedQueryWidth(`>=${item.min}`)! }
                    : {}),
                }
              : {
                  kind: 'container',
                  name: item.container,
                  ...(item.step === null
                    ? { min: item.min!, unit: 'scale' as const }
                    : { step: item.step }),
                }
          const positive = atom(fact)
          return item.negated
            ? { op: 'not' as const, operand: positive }
            : positive
        }),
      })),
    }
  }
  const colon = key.indexOf(':')
  if (colon !== -1)
    return atom({
      kind: 'state',
      part: key.slice(0, colon),
      name: key.slice(colon + 1),
    })
  return atom({ kind: 'variant', axis: key, values })
}

export function queryPredicate(query: QueryPredicate): Predicate {
  if (query.op === 'relation')
    return atom({ kind: 'relation', relation: query.relation })
  if (query.op === 'not')
    return { op: 'not', operand: queryPredicate(query.operand) }
  if (query.op !== 'atom')
    return { op: query.op, operands: query.operands.map(queryPredicate) }
  if (query.key.startsWith('['))
    return {
      op: 'all',
      operands: [...parseVariantSelector(query.key)].map(([key, values]) =>
        conditionPredicate(key, values),
      ),
    }
  return conditionPredicate(query.key)
}

export function factKey(fact: Fact): string {
  switch (fact.kind) {
    case 'variant':
      return fact.axis
    case 'state':
      return `${fact.part}:${fact.name}`
    case 'media':
      return `@${fact.name}`
    case 'container':
      return `@${fact.name}/${fact.step ?? `>=${fact.min}`}`
    case 'platform':
      return '@platform'
    case 'relation':
      return relationFactKey(fact.relation)
  }
}

export type Facts = Readonly<Record<string, unknown>>

/** Shared Boolean reduction; neither platform specialization nor runtime
 * evaluation expands predicates into a combinatorial disjunctive normal form. */
function mapFacts(
  predicate: Predicate,
  map: (fact: Fact) => Predicate,
): Predicate {
  if (predicate.op === 'atom') return map(predicate.fact)
  if (predicate.op === 'not') {
    const operand = mapFacts(predicate.operand, map)
    return operand === TRUE
      ? FALSE
      : operand === FALSE
        ? TRUE
        : { op: 'not', operand }
  }
  const operands = predicate.operands.map((child) => mapFacts(child, map))
  const decisive = predicate.op === 'all' ? FALSE : TRUE
  const neutral = predicate.op === 'all' ? TRUE : FALSE
  if (operands.includes(decisive)) return decisive
  const remaining = operands.filter((child) => child !== neutral)
  return remaining.length === 0
    ? neutral
    : remaining.length === 1
      ? remaining[0]!
      : { op: predicate.op, operands: remaining }
}

/** Foreign platform branches cannot become requirements in a web build inventory. */
export function specializePlatform(
  predicate: Predicate,
  platform: 'web' | 'native',
): Predicate {
  return mapFacts(predicate, (fact) =>
    fact.kind === 'platform'
      ? fact.name === platform
        ? TRUE
        : FALSE
      : atom(fact),
  )
}

/** Browser facts remain symbolic; only host-owned relations/cross-part facts and
 * variant inputs are evaluated when a browser adapter will select conditions. */
export function evaluatePredicate(
  predicate: Predicate,
  facts: Facts,
  platform: 'web' | 'native',
  preserveConditions = false,
  part?: string,
): Predicate {
  return mapFacts(predicate, (fact) => {
    if (fact.kind === 'platform') return fact.name === platform ? TRUE : FALSE
    if (
      preserveConditions &&
      fact.kind !== 'variant' &&
      fact.kind !== 'relation' &&
      (fact.kind !== 'state' || fact.part === part)
    )
      return atom(fact)
    const value = facts[factKey(fact)]
    const matches =
      fact.kind === 'variant'
        ? !fact.values.length || fact.values.includes(String(value))
        : value === true
    return matches ? TRUE : FALSE
  })
}
