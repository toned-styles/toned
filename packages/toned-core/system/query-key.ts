import {
  selectorText,
  type SelectorText,
} from '../stylesheet/variantSelector.ts'
import type { QueryAtom, QueryPredicate } from './queries.ts'

/** Deterministic, self-contained query keys. No registry or render-time lookup. */
export type QueryKey = `@query ${string}`
type Replace<
  S extends string,
  A extends string,
  B extends string,
> = string extends S
  ? string
  : S extends `${infer H}${A}${infer T}`
    ? `${H}${B}${Replace<T, A, B>}`
    : S
type Escape<S extends string> = Replace<
  Replace<Replace<S, '%', '%25'>, '|', '%7C'>,
  ':',
  '%3A'
>
type Unescape<S extends string> = Replace<
  Replace<Replace<S, '%3A', ':'>, '%7C', '|'>,
  '%25',
  '%'
>
type Encoded<T extends string> = SelectorText<T> extends infer S extends string
  ? S extends `@query ${infer Body}`
    ? Body
    : `a:${Escape<S>}|`
  : never
type Operands<A extends readonly string[]> = number extends A['length']
  ? string
  : A extends readonly [infer H extends string, ...infer T extends string[]]
    ? `${Encoded<H>}${Operands<T>}`
    : ''
export type BooleanQuery<
  Op extends 'all' | 'any',
  A extends readonly string[],
> = `@query ${Operands<A>}${Op}:${A['length']}|`
export type NotQuery<A extends string> = `@query ${Encoded<A>}not|`
export type RelationQuery<
  Source extends string,
  Target extends string,
  State extends string,
  Scope extends string,
> = `@query r:${Escape<Source>}:${Escape<Target>}:${Escape<State>}:${Scope}|`

/** Validate references after a base factory has inferred its complete part set. */
export type ValidQueryKey<
  Key extends string,
  S,
  Parts extends string,
  Local extends boolean = false,
> = Key extends `@query ${infer Body}`
  ? ValidTokens<Body, S, Parts, Local>
  : false
type ValidTokens<
  Body extends string,
  S,
  Parts extends string,
  Local extends boolean,
> = string extends Body
  ? false
  : Body extends ''
    ? true
    : Body extends `${infer Token}|${infer Rest}`
      ? ValidToken<Token, S, Parts, Local> extends true
        ? ValidTokens<Rest, S, Parts, Local>
        : false
      : false
type ValidToken<
  Token extends string,
  S,
  Parts extends string,
  Local extends boolean,
> = Token extends `a:${infer Atom}`
  ? Unescape<Atom> extends QueryAtom<S, Parts>
    ? Unescape<Atom> extends `:${string}`
      ? Local
      : true
    : false
  : Token extends `r:${infer Source}:${infer Target}:${infer State}:${infer Scope}`
    ? Unescape<Source> extends Parts
      ? Unescape<Target> extends Parts
        ? `:${Unescape<State>}` extends QueryAtom<S, Parts>
          ? Scope extends 'child' | 'descendant'
            ? true
            : false
          : false
        : false
      : false
    : Token extends 'not' | `all:${number}` | `any:${number}`
      ? true
      : false

const PREFIX = '@query '
const MAX_TOKENS = 512
const escape = (value: string) =>
  value.replace(/%/g, '%25').replace(/\|/g, '%7C').replace(/:/g, '%3A')
const unescape = (value: string) =>
  value.replace(/%3A/g, ':').replace(/%7C/g, '|').replace(/%25/g, '%')
export const isQueryKey = (value: string): value is QueryKey =>
  value.startsWith(PREFIX)
const encode = (input: string) =>
  isQueryKey(input) ? input.slice(PREFIX.length) : `a:${escape(input)}|`
export function booleanQuery(
  op: 'all' | 'any',
  operands: readonly string[],
): QueryKey {
  return checked(
    `${PREFIX}${operands.map((value) => encode(selectorText(value))).join('')}${op}:${operands.length}|`,
  )
}
export function notQuery(operand: string): QueryKey {
  return checked(`${PREFIX}${encode(selectorText(operand))}not|`)
}
export function relationQuery(
  source: string,
  target: string,
  state: string,
  scope: 'child' | 'descendant',
): QueryKey {
  return checked(
    `${PREFIX}r:${escape(source)}:${escape(target)}:${escape(state)}:${scope}|`,
  )
}
function checked(key: string): QueryKey {
  if (key.length > 65536 || key.split('|').length > MAX_TOKENS + 1)
    throw new Error('Toned: query exceeds 512 nodes or 64 KiB')
  return key as QueryKey
}

export function decodeQuery(key: QueryKey): QueryPredicate {
  checked(key)
  const tokens = key.slice(PREFIX.length).split('|')
  if (tokens.pop() !== '') throw new Error('Toned: malformed query key')
  const stack: QueryPredicate[] = []
  for (const token of tokens) {
    if (token.startsWith('a:')) {
      stack.push(Object.freeze({ op: 'atom', key: unescape(token.slice(2)) }))
    } else if (token.startsWith('r:')) {
      const fields = token.slice(2).split(':')
      const [sourcePart, part, state, scope] = fields.map(unescape)
      if (
        fields.length !== 4 ||
        !sourcePart ||
        !part ||
        !state ||
        (scope !== 'child' && scope !== 'descendant')
      )
        throw new Error('Toned: malformed relation query')
      stack.push(
        Object.freeze({
          op: 'relation',
          relation: Object.freeze({ sourcePart, part, state, scope }),
        }),
      )
    } else if (token === 'not') {
      const operand = stack.pop()
      if (!operand) throw new Error('Toned: malformed negated query')
      stack.push(Object.freeze({ op: 'not', operand }))
    } else {
      const match = /^(all|any):(0|[1-9]\d*)$/.exec(token)
      if (!match || Number(match[2]) > stack.length)
        throw new Error('Toned: malformed Boolean query')
      const count = Number(match[2])
      const operands = Object.freeze(stack.splice(stack.length - count, count))
      stack.push(Object.freeze({ op: match[1] as 'all' | 'any', operands }))
    }
  }
  if (stack.length !== 1) throw new Error('Toned: malformed query expression')
  return stack[0]!
}

export function bindQueryPart(
  query: QueryPredicate,
  part?: string,
): QueryPredicate {
  if (query.op === 'atom' && query.key.startsWith(':')) {
    if (!part)
      throw new Error(
        'Toned: a sheet-level state query needs q.part(name).state(name)',
      )
    return { op: 'atom', key: `${part}${query.key}` }
  }
  if (query.op === 'all' || query.op === 'any')
    return {
      op: query.op,
      operands: query.operands.map((value) => bindQueryPart(value, part)),
    }
  if (query.op === 'not')
    return { op: 'not', operand: bindQueryPart(query.operand, part) }
  return query
}

export const queryExpression = (
  value: QueryPredicate | QueryKey,
): QueryPredicate => (typeof value === 'string' ? decodeQuery(value) : value)
