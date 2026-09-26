/** CSS-like selector keys with the same canonical order at type and runtime. */
import type { ModType } from '../types/stylesheet.ts'

const NAMED_PREFIX = '$named$_' as const
const NONE_VALUE = '*' as const
export type NamedStyleKey<Name extends string> = `$named$_${Name}`
export type { ExtractNamedStyles } from '../types/composition.ts'
export type VariantKey = string

declare const SELECTOR_TEXT: unique symbol
/** @internal A selector produced by an axis builder, not an unchecked raw string. */
export type BuiltVariantKey = string & { readonly [SELECTOR_TEXT]: string }
/** @internal Strip selector methods while retaining the canonical literal key. */
export type SelectorText<T extends string> = T extends {
  readonly [SELECTOR_TEXT]: infer Key extends string
}
  ? Key
  : T

type Scalar = string | number | boolean
type AxisValues<Value> = readonly [
  Exclude<Value, undefined> & Scalar,
  ...(Exclude<Value, undefined> & Scalar)[],
]
type Selection = readonly [string, readonly string[]]
type Replace<
  S extends string,
  From extends string,
  To extends string,
> = S extends `${infer Head}${From}${infer Tail}`
  ? `${Head}${To}${Replace<Tail, From, To>}`
  : S
// Escape syntax delimiters once. Literal percent sequences remain distinguishable.
type Escape<S extends string> = Replace<
  Replace<
    Replace<
      Replace<
        Replace<Replace<Replace<S, '%', '%25'>, '[', '%5B'>, ']', '%5D'>,
        '=',
        '%3D'
      >,
      '|',
      '%7C'
    >,
    ',',
    '%2C'
  >,
  '*',
  '%2A'
>
// Printable ASCII code-point order is the common token vocabulary. For other
// characters, widen the ordering to both possibilities instead of promising a
// false literal spelling. Runtime still orders all Unicode strings correctly.
type Alphabet =
  ' !"#$%&\'()*+,-./0123456789:;<=>?@ABCDEFGHIJKLMNOPQRSTUVWXYZ[\\]^_`abcdefghijklmnopqrstuvwxyz{|}~'
type Before<A extends string, B extends string> = string extends A | B
  ? boolean
  : A extends B
    ? false
    : A extends ''
      ? true
      : B extends ''
        ? false
        : A extends `${infer AH}${infer AT}`
          ? B extends `${infer BH}${infer BT}`
            ? AH extends BH
              ? Before<AT, BT>
              : Alphabet extends `${string}${AH}${infer Rest}`
                ? Rest extends `${string}${BH}${string}`
                  ? true
                  : Alphabet extends `${string}${BH}${string}`
                    ? false
                    : boolean
                : boolean
            : false
          : false

type InsertString<
  Values extends readonly string[],
  Value extends string,
> = Values extends readonly [
  infer Head extends string,
  ...infer Tail extends string[],
]
  ? Value extends Head
    ? Values
    : Before<Value, Head> extends infer Order
      ? Order extends true
        ? readonly [Value, ...Values]
        : readonly [Head, ...InsertString<Tail, Value>]
      : never
  : readonly [Value]
type SortValues<
  Values extends readonly Scalar[],
  Out extends readonly string[] = [],
> = Values extends readonly [
  infer Head extends Scalar,
  ...infer Tail extends Scalar[],
]
  ? SortValues<Tail, InsertString<Out, `${Head}`>>
  : Out

type InsertSelection<
  Selections extends readonly Selection[],
  Value extends Selection,
> = Selections extends readonly [
  infer Head extends Selection,
  ...infer Tail extends Selection[],
]
  ? Before<Value[0], Head[0]> extends infer Order
    ? Order extends true
      ? readonly [Value, ...Selections]
      : readonly [Head, ...InsertSelection<Tail, Value>]
    : never
  : readonly [Value]
type ValueKey<
  Key extends string,
  Values extends readonly string[],
> = Values extends readonly [
  infer Head extends string,
  ...infer Tail extends string[],
]
  ? `[${Escape<Key>}=${Escape<Head>}]${ValueKey<Key, Tail>}`
  : ''
type SelectionKey<Selections extends readonly Selection[]> =
  Selections extends readonly [
    infer Head extends Selection,
    ...infer Tail extends Selection[],
  ]
    ? `${ValueKey<Head[0], Head[1]>}${SelectionKey<Tail>}`
    : ''

type Next<
  Mods extends ModType,
  Acc,
  Selections extends readonly Selection[],
  K extends string,
  Values extends readonly Scalar[],
> = number extends Values['length'] | Selections['length']
  ? VariantBuilder<
      Mods,
      Acc & Record<K, Values[number]>,
      string,
      readonly Selection[]
    >
  : InsertSelection<
        Selections,
        readonly [K, SortValues<Values>]
      > extends infer Sorted extends readonly Selection[]
    ? VariantBuilder<
        Mods,
        Acc & Record<K, Values[number]>,
        SelectionKey<Sorted>,
        Sorted
      >
    : never

// The literal overload determines identity. The vocabulary overload keeps all
// valid alternatives visible when editing an already valid argument. Unlike a
// union parameter, it cannot bypass an explicitly supplied literal tuple type.
type AxisSelector<
  Mods extends ModType,
  Acc,
  Selections extends readonly Selection[],
  K extends keyof Mods & string,
> = {
  <const Values extends AxisValues<Mods[K]>>(
    ...values: Values
  ): Next<Mods, Acc, Selections, K, Values>
  (
    ...values: AxisValues<Mods[K]>
  ): Next<Mods, Acc, Selections, K, AxisValues<Mods[K]>>
}

export type VariantBuilder<
  Mods extends ModType,
  Acc = {},
  Key extends string = '',
  Selections extends readonly Selection[] = [],
> = Key & { readonly [SELECTOR_TEXT]: Key } & {
  [K in Exclude<keyof Mods, keyof Acc> as K extends string
    ? K
    : never]-?: K extends string
    ? AxisSelector<Mods, Acc, Selections, K>
    : never
}

export type VariantSelector<Mods extends ModType> = (<Name extends string>(
  name: Name,
) => NamedStyleKey<Name>) & {
  [K in keyof Mods as K extends string ? K : never]-?: K extends string
    ? AxisSelector<Mods, {}, [], K>
    : never
}

export function escapeSelectorPart(value: string): string {
  return value
    .replace(/%/g, '%25')
    .replace(/\[/g, '%5B')
    .replace(/\]/g, '%5D')
    .replace(/=/g, '%3D')
    .replace(/\|/g, '%7C')
    .replace(/,/g, '%2C')
    .replace(/\*/g, '%2A')
}
export function unescapeSelectorPart(value: string): string {
  return value
    .replace(/%2A/g, '*')
    .replace(/%2C/g, ',')
    .replace(/%7C/g, '|')
    .replace(/%3D/g, '=')
    .replace(/%5D/g, ']')
    .replace(/%5B/g, '[')
    .replace(/%25/g, '%')
}

/** Omitted axes are wildcards; no invented wildcard segments enter typed keys. */
export function canonicalSelectorKey(
  selections: ReadonlyMap<string, readonly Scalar[]>,
): string {
  return [...selections.keys()]
    .sort()
    .map((key) =>
      [...new Set(selections.get(key)!.map(String))]
        .sort()
        .map(
          (value) =>
            `[${escapeSelectorPart(key)}=${escapeSelectorPart(value)}]`,
        )
        .join(''),
    )
    .join('')
}

function createBuilder(
  selections: ReadonlyMap<string, readonly Scalar[]>,
  emit: (key: string) => string,
): VariantBuilder<ModType> {
  return new Proxy({} as VariantBuilder<ModType>, {
    get(_, prop) {
      if (prop === Symbol.toPrimitive || prop === 'toString')
        return () => emit(canonicalSelectorKey(selections))
      if (typeof prop !== 'string') return undefined
      return (...values: Scalar[]) => {
        if (!values.length)
          throw new Error(`Variant ${prop} needs at least one value`)
        if (selections.has(prop))
          throw new Error(`Variant ${prop} was already selected in this chain`)
        return createBuilder(new Map([...selections, [prop, values]]), emit)
      }
    },
  })
}

/**
 * `orderedKeys` remains accepted for older callers; canonical identity depends
 * only on selected axes/values, so declaration factories need only one pass.
 * Factories can reject duplicate emitted keys before JS object construction
 * silently discards their earlier declaration.
 */
export function createVariantSelector<Mods extends ModType>(
  _orderedKeys: readonly (keyof Mods)[] = [],
  options?: { rejectDuplicates?: boolean },
): VariantSelector<Mods> {
  const emitted = new Set<string>()
  const emit = (key: string) => {
    if (options?.rejectDuplicates && emitted.has(key))
      throw new Error(`Duplicate Toned variant selector: ${key}`)
    emitted.add(key)
    return key
  }
  return new Proxy((() => {}) as unknown as VariantSelector<Mods>, {
    apply(_, __, args) {
      if (typeof args[0] !== 'string')
        throw new Error('Named style requires a string name')
      return emit(`${NAMED_PREFIX}${args[0]}`)
    },
    get(_, prop) {
      if (typeof prop !== 'string') return undefined
      return (...values: Scalar[]) => {
        if (!values.length)
          throw new Error(`Variant ${prop} needs at least one value`)
        return createBuilder(new Map([[prop, values]]), emit)
      }
    },
  })
}

export function isNamedStyleKey(key: string): key is `$named$_${string}` {
  return key.startsWith(NAMED_PREFIX)
}
export function getNamedStyleName(key: `$named$_${string}`): string {
  return key.slice(NAMED_PREFIX.length)
}
export function isNoneValue(value: string): value is typeof NONE_VALUE {
  return value === NONE_VALUE
}
