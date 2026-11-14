import type { LogicalLength } from '../core/values.ts'
import type { Relation } from '../stylesheet/relations.ts'
import type { BuiltVariantKey } from '../stylesheet/variantSelector.ts'
import type { Platform } from '../types/config.ts'
import type { QuoteList, TonedError } from '../types/errors.ts'
import type { Pseudo } from '../types/stylesheet.ts'
import {
  booleanQuery,
  notQuery,
  relationQuery,
  type BooleanQuery,
  type NotQuery,
  type QueryKey,
  type RelationQuery,
} from './query-key.ts'
import type { ContainerWidthOf, MediaWidthOf, WidthAtomOf } from './widths.ts'

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
/** A width the system does not declare, as the error naming the fix. */
type MediaArgument<C, A> =
  A extends FixedLength<infer N>
    ? number extends N
      ? unknown
      : [N] extends [MediaWidthOf<C>]
        ? unknown
        : TonedError<`${N}px is not a width the system declares, and the build emits CSS only for declared conditions: add ${N} to conditions.widths.media, or name it in conditions.media and write q.media('<name>')`>
    : A extends Media<C>
      ? unknown
      : TonedError<`Unknown media '${A & string}'. Declared media: ${[Media<C>] extends [never] ? 'none' : QuoteList<Media<C>>}`>
type ContainerArgument<C, Name extends string, A> =
  A extends FixedLength<infer N>
    ? number extends N
      ? unknown
      : [N] extends [ContainerWidthOf<C, Name>]
        ? unknown
        : TonedError<`${N}px is not a width the system declares for the container '${Name}', and the build emits CSS only for declared conditions: add ${N} to conditions.widths.containers.${Name}, or name a step in conditions.containers.${Name}`>
    : A extends keyof Containers<C>[Name & keyof Containers<C>]
      ? unknown
      : TonedError<`Unknown step '${A & string}' of the container '${Name}'. Declared steps: ${[keyof Containers<C>[Name & keyof Containers<C>] & string] extends [never] ? 'none' : QuoteList<keyof Containers<C>[Name & keyof Containers<C>] & string>}`>
export type QueryPredicate = Readonly<
  | { op: 'atom'; key: string }
  | { op: 'relation'; relation: Relation }
  | { op: 'all' | 'any'; operands: readonly QueryPredicate[] }
  | { op: 'not'; operand: QueryPredicate }
>
type ContainerAtoms<C> = {
  [
    N in keyof Containers<C> & string
  ]: `@${N}/${keyof Containers<C>[N] & string}`
}[keyof Containers<C> & string]
export type QueryAtom<C, Parts extends string = string> =
  | `:${State<C>}`
  | `@${Media<C>}`
  | ContainerAtoms<C>
  | `@${WidthAtomOf<C>}`
  | `@platform ${Platform}`
  | `@platform.${Platform}`
  | `${Parts}:${State<C>}`
  | `[${string}]`
type QueryOperand<C, Parts extends string> =
  | Exclude<QueryAtom<C, Parts>, `[${string}]`>
  | BuiltVariantKey
  | QueryKey
export type QueryBuilder<C, Parts extends string = string> = {
  state<N extends State<C>>(name: N): `:${N}`
  /**
   * A declared media name (`'md'`), or a width threshold the system declares
   * in `conditions.widths.media` (`dp(600)`). One signature, so an undeclared
   * width reports the error naming its fix and still returns its key.
   */
  media<const A extends Media<C> | (string & {}) | FixedLength>(
    value: A & MediaArgument<C, A>,
  ): A extends FixedLength<infer N> ? `@>=${N}px` : `@${A & string}`
  /**
   * A declared container step (`'wide'`), or a width threshold the system
   * declares in `conditions.widths.containers.<name>` (`dp(300)`).
   */
  container<
    N extends keyof Containers<C> & string,
    const A extends
      | (keyof Containers<C>[N] & string)
      | (string & {})
      | FixedLength,
  >(
    name: N,
    step: A & ContainerArgument<C, N, A>,
  ): A extends FixedLength<infer W> ? `@${N}/>=${W}px` : `@${N}/${A & string}`
  part<N extends Parts>(
    name: N,
  ): {
    state<St extends State<C>>(state: St): `${N}:${St}`
    /** Relationships stay inside one mounted instance and use registered part ancestry. */
    has<
      Target extends Parts,
      St extends State<C>,
      Scope extends 'child' | 'descendant' = 'descendant',
    >(
      part: Target,
      state: St,
      options?: { scope?: Scope },
    ): RelationQuery<N, Target, St, Scope>
  }
  /** The canonical `'@platform web'` key (the `'@platform.web'` alias is
   *  still accepted, and deprecated). */
  platform<P extends Platform>(platform: P): `@platform ${P}`
  all<const A extends readonly QueryOperand<C, Parts>[]>(
    ...operands: A
  ): BooleanQuery<'all', A>
  any<const A extends readonly QueryOperand<C, Parts>[]>(
    ...operands: A
  ): BooleanQuery<'any', A>
  not<const A extends QueryOperand<C, Parts>>(operand: A): NotQuery<A>
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
/** Every condition builder returns a deterministic computed property key. */
export function createQueries<C, Parts extends string = string>(): QueryBuilder<
  C,
  Parts
> {
  return Object.freeze({
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
      ) => relationQuery(name, part, state, options?.scope ?? 'descendant'),
    }),
    platform: (platform: string) => `@platform ${platform}`,
    all: (...operands: string[]) => booleanQuery('all', operands),
    any: (...operands: string[]) => booleanQuery('any', operands),
    not: (operand: string) => notQuery(operand),
  }) as QueryBuilder<C, Parts>
}
