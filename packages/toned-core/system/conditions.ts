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

/**
 * A condition node. TYPED as its serialized key intersected with the carried
 * DNF — the VariantBuilder trick — so a builder result is a legal COMPUTED
 * OBJECT KEY with a precise template type (`cq('card').min(100)` types as
 * `'@card/>=100' & {…}`), and the stylesheet input's shaped key patterns
 * check it. At runtime it is an object whose toString/toPrimitive yield the
 * key.
 */
export type Condition<K extends `@${string}` = `@${string}`> = K & {
  readonly [SYMBOL_EXPR]: ConditionExpr
}

/**
 * What a combinator's key can look like — one of the expression-shaped
 * patterns the stylesheet input accepts. Not statically exact (De Morgan
 * changes shape), but always within these.
 */
export type CombinedConditionKey =
  | `@!${string}`
  | `@${string}&${string}`
  | `@${string}|${string}`

function node<K extends `@${string}`>(expr: ConditionExpr): Condition<K> {
  const key = `@${serializeExpr(expr)}`
  return {
    [SYMBOL_EXPR]: expr,
    toString: () => key,
    [Symbol.toPrimitive]: () => key,
  } as unknown as Condition<K>
}

function exprOf(c: Condition | string): ConditionExpr {
  if (typeof c === 'string') {
    const parsed = parseConditionKey(c[0] === '@' ? c.slice(1) : c)
    if (!parsed) throw new Error(`not a condition key: ${JSON.stringify(c)}`)
    return parsed
  }
  return (c as unknown as { [SYMBOL_EXPR]: ConditionExpr })[SYMBOL_EXPR]
}

const atom = <K extends `@${string}`>(a: ConditionAtom): Condition<K> =>
  node<K>([[a]])

/** A declared viewport breakpoint as a condition atom: `bp('md')` → `'@md'`. */
export function bp<N extends string>(name: N): Condition<`@${N}`> {
  return atom({ container: null, step: name, min: null, negated: false })
}

/** The per-container builder `cq(name)` returns. */
export type ContainerConditionBuilder<N extends string> = {
  /**
   * width >= the given length. A NUMBER rides the universal spacing scale
   * (× the system's `base`, default 4px — `min(100)` is 400px, exactly as
   * `gap: 2` is 8px); a string is a css length passed to the web verbatim.
   */
  min<L extends number | string>(length: L): Condition<`@${N}/>=${L}`>
  /** width < the given length — canonicalized as `not(min(length))`. */
  below<L extends number | string>(length: L): Condition<`@!${N}/>=${L}`>
  /** A declared step of this container: `cq('field-group').step('md')`. */
  step<St extends string>(step: St): Condition<`@${N}/${St}`>
}

/**
 * A declared container's condition builder. The name must be declared in the
 * system's `containers`; the VALUES are free at the use site. Prefer the
 * SYSTEM's `cq` (defineSystem returns one typed to its declared names).
 */
export function cq<N extends string>(name: N): ContainerConditionBuilder<N> {
  return {
    min: (length) =>
      atom({ container: name, step: null, min: length, negated: false }),
    below: (length) =>
      atom({ container: name, step: null, min: length, negated: true }),
    step: (step) => atom({ container: name, step, min: null, negated: false }),
  }
}

/** True when every given condition holds — clauses multiply out to DNF. */
export function and(
  ...conditions: [Condition | string, ...Array<Condition | string>]
): Condition<CombinedConditionKey> {
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
export function or(
  ...conditions: [Condition | string, ...Array<Condition | string>]
): Condition<CombinedConditionKey> {
  return node(conditions.flatMap((c) => exprOf(c)))
}

/**
 * True when the condition does not hold. De Morgan over the DNF, normalized
 * back to DNF: the clauses of the result pick one negated atom from each
 * original clause. Tiny inputs in practice; the expansion is exact.
 */
export function not(
  condition: Condition | string,
): Condition<CombinedConditionKey> {
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
