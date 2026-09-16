import type { LogicalLength } from '../core/values.ts'
import type { Relation } from '../stylesheet/relations.ts'
import type { Platform } from '../types/config.ts'
import type { CheckedVariantRules, Pseudo } from '../types/stylesheet.ts'
import type { TokenStyleDeclaration } from '../types/tokens.ts'

type FixedLength<N extends number = number> = LogicalLength & {
  unit: 'dp'
  value: N
}

type State<C> = Pseudo extends `:${infer N}`
  ? N | (C extends { states: infer S } ? keyof S & string : never)
  : never
type Media<C> = C extends { media: infer M }
  ? keyof M & string
  : C extends { breakpoints: { __breakpoints: infer B } }
    ? keyof B & string
    : never
type Containers<C> = C extends { containers: infer B } ? B : never
export type QueryPredicate = Readonly<
  | { op: 'atom'; key: string }
  | { op: 'relation'; relation: Relation }
  | { op: 'all' | 'any'; operands: readonly QueryPredicate[] }
  | { op: 'not'; operand: QueryPredicate }
>
type ContainerAtoms<C> = {
  [N in keyof Containers<C> &
    string]: `@${N}/${keyof Containers<C>[N] & string}`
}[keyof Containers<C> & string]
export type QueryAtom<C, Parts extends string = string> =
  | `:${State<C>}`
  | `@${Media<C>}`
  | ContainerAtoms<C>
  | `@>=${number}px`
  | `@${keyof Containers<C> & string}/>=${number}px`
  | `@platform.${Platform}`
  | `${Parts}:${State<C>}`
  | `[${string}]`
export type QueryBuilder<C, Parts extends string = string> = {
  /** TypeScript does not excess-check callback return values. This identity
   * constructor checks the inferred variant rule map before returning it. */
  rules<const Input>(
    input: Input &
      (C extends TokenStyleDeclaration
        ? CheckedVariantRules<C, Parts, Input>
        : never),
  ): Input
  state<N extends State<C>>(name: N): `:${N}`
  media<N extends Media<C>>(name: N): `@${N}`
  media<const N extends number>(minimum: FixedLength<N>): `@>=${N}px`
  container<
    N extends keyof Containers<C> & string,
    Step extends keyof Containers<C>[N] & string,
  >(name: N, step: Step): `@${N}/${Step}`
  container<N extends keyof Containers<C> & string, const Width extends number>(
    name: N,
    minimum: FixedLength<Width>,
  ): `@${N}/>=${Width}px`
  part<N extends Parts>(
    name: N,
  ): {
    state<St extends State<C>>(state: St): `${N}:${St}`
    /** Relationships stay inside one mounted instance and use registered part ancestry. */
    has<Target extends Parts, St extends State<C>>(
      part: Target,
      state: St,
      options?: { scope?: 'child' | 'descendant' },
    ): QueryPredicate
  }
  platform<P extends Platform>(platform: P): `@platform.${P}`
  all(
    ...operands: readonly (QueryAtom<C, Parts> | QueryPredicate)[]
  ): QueryPredicate
  any(
    ...operands: readonly (QueryAtom<C, Parts> | QueryPredicate)[]
  ): QueryPredicate
  not(operand: QueryAtom<C, Parts> | QueryPredicate): QueryPredicate
}
const predicate = (value: string | QueryPredicate): QueryPredicate => {
  if (
    typeof value === 'object' &&
    value !== null &&
    ['atom', 'relation', 'all', 'any', 'not'].includes(value.op)
  )
    return value
  const key = String(value)
  if (!/^(?:@[^\s]+|[^:]*:[^\s]+|\[.+\])$/.test(key))
    throw new Error(`Toned: invalid query atom ${key}`)
  return Object.freeze({ op: 'atom', key })
}
const fixedKey = (value: string | FixedLength): string => {
  if (typeof value === 'string') return value
  if (
    !value ||
    value.$tonedValue !== 'length' ||
    value.unit !== 'dp' ||
    !Number.isFinite(value.value) ||
    value.value < 0
  )
    throw new Error(
      'Toned: query thresholds require finite nonnegative dp lengths',
    )
  return `>=${value.value}px`
}
/** Finite atom builders return primitive literal keys; boolean expressions are
 * deliberately objects and cannot silently widen an element's key space. */
export function createQueries<C, Parts extends string = string>(): QueryBuilder<
  C,
  Parts
> {
  return Object.freeze({
    rules: <Input>(input: Input) => input,
    state: (name: string) => `:${name}`,
    media: (name: string | FixedLength) => `@${fixedKey(name)}`,
    container: (name: string, step: string | FixedLength) =>
      `@${name}/${fixedKey(step)}`,
    part: (name: string) => ({
      state: (state: string) => `${name}:${state}`,
      has: (
        part: string,
        state: string,
        options?: { scope?: 'child' | 'descendant' },
      ) =>
        Object.freeze({
          op: 'relation',
          relation: Object.freeze({
            sourcePart: name,
            part,
            state,
            scope: options?.scope ?? 'descendant',
          }),
        }),
    }),
    platform: (platform: string) => `@platform.${platform}`,
    all: (...operands: (string | QueryPredicate)[]) =>
      Object.freeze({
        op: 'all',
        operands: Object.freeze(operands.map(predicate)),
      }),
    any: (...operands: (string | QueryPredicate)[]) =>
      Object.freeze({
        op: 'any',
        operands: Object.freeze(operands.map(predicate)),
      }),
    not: (operand: string | QueryPredicate) =>
      Object.freeze({ op: 'not', operand: predicate(operand) }),
  }) as QueryBuilder<C, Parts>
}
