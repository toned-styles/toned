/**
 * Compile-time error messages for the keys a stylesheet rejects.
 *
 * A rejected key's value is checked against `TonedError<'…'>` instead of
 * `never`, so the compiler's own message carries the text: "Type 'number' is
 * not assignable to type 'TonedError<"Unknown token 'gapp'. Did you mean
 * 'gap'?">'". Each message names what was wrong and what to write instead,
 * with the valid set (or its first entries) when there is one.
 *
 * The brand is an object, not the message string itself: a string would
 * intersect a written primitive (`gapp: 1`) away to `never` and lose the text.
 * Nothing can satisfy it, because its key is a type-only symbol.
 *
 * Every type here is reached only on a REJECTED key, so its cost is paid per
 * mistake, never per valid sheet.
 *
 * @module types/errors
 */
import type { Properties } from 'csstype'

import type { WithinKeyMessage } from './contexts.ts'
import type { PortableInlineStyle } from './style.ts'

declare const TONED_ERROR: unique symbol

/** The type a rejected key's value is checked against; `Message` says why. */
export interface TonedError<Message extends string> {
  readonly [TONED_ERROR]: Message
}

/** Whether `K` is one literal string, not a pattern (`@${string}`) or `string`. */
export type IsLiteral<K> = K extends string
  ? {} extends Record<K, 1>
    ? false
    : true
  : false

/** The literal string members of `K`, without patterns and symbols. */
type Literals<K> = K extends string
  ? {} extends Record<K, 1>
    ? never
    : K
  : never

type UnionToIntersection<U> = (
  U extends unknown ? (x: U) => void : never
) extends (x: infer I) => void
  ? I
  : never
type LastOf<U> =
  UnionToIntersection<U extends unknown ? () => U : never> extends () => infer L
    ? L
    : never
type UnionToTuple<U, Acc extends unknown[] = []> = [U] extends [never]
  ? Acc
  : LastOf<U> extends infer L
    ? UnionToTuple<Exclude<U, L>, [L, ...Acc]>
    : Acc
type JoinQuoted<
  T extends unknown[],
  Max extends number,
  Prefix extends string,
  Acc extends string = '',
  Seen extends unknown[] = [],
> = T extends [infer H extends string, ...infer R]
  ? Seen['length'] extends Max
    ? `${Acc}, …`
    : JoinQuoted<
        R,
        Max,
        Prefix,
        Acc extends '' ? `'${Prefix}${H}'` : `${Acc}, '${Prefix}${H}'`,
        [...Seen, H]
      >
  : Acc

/**
 * `'a', 'b', 'c'` from `'a' | 'b' | 'c'`, in declaration order, at most `Max`
 * entries and then `…`. `Prefix` is written before each (`'@'` for media).
 */
export type QuoteList<
  U,
  Max extends number = 8,
  Prefix extends string = '',
> = JoinQuoted<UnionToTuple<Literals<U>>, Max, Prefix>

type AtLeastTwo<S extends string> = S extends `${infer _A}${infer _B}${string}`
  ? true
  : false

/**
 * The candidates sharing the longest prefix with `Written`, when that prefix
 * is at least two characters: `'gapp'` → `'gap'`, `'backgroundColour'` →
 * `'backgroundColor'`. One narrowing per character, so it is linear in the
 * candidates and the written length.
 */
export type Closest<
  Written extends string,
  Candidates extends string,
  Prefix extends string = '',
  Rest extends string = Written,
> = Rest extends `${infer C}${infer R}`
  ? [Extract<Candidates, `${Prefix}${C}${string}`>] extends [never]
    ? AtLeastTwo<Prefix> extends true
      ? Candidates
      : never
    : Closest<
        Written,
        Extract<Candidates, `${Prefix}${C}${string}`>,
        `${Prefix}${C}`,
        R
      >
  : AtLeastTwo<Prefix> extends true
    ? Candidates
    : never

/** `" Did you mean 'x'?"`, or `''` when nothing is close. */
export type DidYouMean<
  Written extends string,
  Candidates extends string,
  Sigil extends string = '',
> =
  Closest<Written, Literals<Candidates>> extends infer Near extends string
    ? [Near] extends [never]
      ? ''
      : ` Did you mean ${QuoteList<Near, 3, Sigil>}?`
    : ''

/** What a rejected key's value is checked against, for a key in `$style`. */
export type StyleKeyError<
  K extends string,
  Keys,
  Host extends 'web' | 'native' | 'portable',
> = K extends `:${string}` | `@${string}`
  ? TonedError<`'${K}' is a condition and cannot go inside $style: write it beside $style, as { '${K}': { $style: { … } } }`>
  : Host extends 'web'
    ? TonedError<`Unknown CSS property '${K}'.${DidYouMean<K, Keys & string>}`>
    : // Rejected here, so a CSS property is one this host does not take.
      K extends keyof Properties | `--${string}`
      ? TonedError<`'${K}' is web-only: put it under '@platform web': { $style: { ${K}: … } }, or use a token`>
      : TonedError<`Unknown ${Host} style property '${K}'.${DidYouMean<K, Keys & string>}`>

/** States a key may name, split for the message. */
type StateMessage<
  K extends string,
  Bad extends string,
  Declared extends string,
  BuiltIn extends string,
> = `Unknown state ':${Bad}'${K extends `:${Bad}` ? '' : ` in '${K}'`}.${DidYouMean<Bad, StateName<Declared | BuiltIn>, ':'>} Declared states: ${[Declared] extends [never] ? 'none' : QuoteList<Declared>}; built-in: ${QuoteList<BuiltIn>}`

type StateName<S> = S extends `:${infer N}` ? N : never

/** The first written state in `:a:b:c` that is not declared, or never. */
type FirstBadState<
  Body extends string,
  Valid extends string,
> = Body extends `${infer Head}:${infer Tail}`
  ? `:${Head}` extends Valid
    ? FirstBadState<Tail, Valid>
    : Head
  : `:${Body}` extends Valid
    ? never
    : Body

/** A raw selector key (`"[data-state='open']"`): the declared state it is. */
type RawSelectorMessage<K extends string, States, Declared extends string> = {
  [N in keyof States & string]: States[N] extends K ? N : never
}[keyof States & string] extends infer Name extends string
  ? [Name] extends [never]
    ? `'${K}' is a raw selector, not a key: declare it in conditions.states and write ':<name>'. Declared states: ${[Declared] extends [never] ? 'none' : QuoteList<Declared>}`
    : `'${K}' is a raw selector, not a key: it is the declared state ':${Name}', so write ':${Name}'`
  : never

/** A condition key (`'@mdd'`) or one atom of an expression (`'@md&!xx'`). */
type ConditionMessage<
  K extends string,
  Atom extends string,
  Media extends string,
  Containers extends string,
> = Atom extends `>=${infer N}px`
  ? `'${K}' uses the width ${N}px, which the system does not declare, and the build emits CSS only for declared conditions: add ${N} to conditions.widths.media, or name it in conditions.media`
  : Atom extends `${infer Name}/>=${infer N}`
    ? N extends `${infer Px}px`
      ? `'${K}' uses the width ${Px}px on the container '${Name}', which the system does not declare, and the build emits CSS only for declared conditions: add ${Px} to conditions.widths.containers.${Name} (with '${Name}' declared in conditions.containers), or name a step in conditions.containers.${Name}`
      : `'${K}' uses '${Name}/>=${N}', which is not a fixed width: write q.container('${Name}', dp(<px>)) and add the width to conditions.widths.containers.${Name}`
    : `Unknown condition '${K extends `@${Atom}` | `@media ${Atom}` ? K : `${Atom}' in '${K}`}'.${DidYouMean<Atom, Media | Containers, '@'>} Declared media: ${[Media] extends [never] ? 'none' : QuoteList<Media, 8, '@'>}${[Containers] extends [never] ? '' : `; containers: ${QuoteList<Containers, 8, '@'>}`}; or a width declared in conditions.widths, such as q.media(dp(600))`

/** The first atom of a condition expression body that is not declared.
 *  `Widths` is every declared width atom (`>=600px`, `card/>=300px`). */
export type FirstBadAtom<
  Body extends string,
  Media extends string,
  Widths extends string,
  Containers extends string,
> = Body extends `${infer Head}&${infer Tail}`
  ? [FirstBadAtom<Head, Media, Widths, Containers>] extends [never]
    ? FirstBadAtom<Tail, Media, Widths, Containers>
    : FirstBadAtom<Head, Media, Widths, Containers>
  : Body extends `${infer Head}|${infer Tail}`
    ? [FirstBadAtom<Head, Media, Widths, Containers>] extends [never]
      ? FirstBadAtom<Tail, Media, Widths, Containers>
      : FirstBadAtom<Head, Media, Widths, Containers>
    : Body extends `!${infer Atom}`
      ? FirstBadAtom<Atom, Media, Widths, Containers>
      : IsLiteral<Body> extends false
        ? never
        : Body extends Media | Containers | Widths
          ? never
          : Body

/** A cross-part key (`'Item:hover'`, `'Item~:open'`) naming an unknown part
 *  or a state that part key cannot take. */
type CrossKeyMessage<K extends string, V extends KeyVocabulary> = (
  K extends `${infer Part}~:${infer State}`
    ? [Part, State]
    : K extends `${infer Part}:${infer State}`
      ? [Part, State]
      : [K, '']
) extends [infer Part extends string, infer State extends string]
  ? Part extends V['parts']
    ? StateMessage<K, State, V['declaredStates'], V['builtInStates']>
    : `Unknown part '${Part}' in '${K}'.${DidYouMean<Part, V['parts']>} Declared parts: ${QuoteList<V['parts']>}`
  : never

/** A part to name in an example: `Root` when the sheet has one. */
type FirstPart<Parts extends string> = 'Root' extends Parts
  ? 'Root'
  : [Parts] extends [never]
    ? 'Root'
    : Literals<Parts> extends infer P extends string
      ? [P] extends [never]
        ? 'Root'
        : UnionFirst<P>
      : 'Root'

/** One member of a union (the compiler's first), for an example. */
type UnionFirst<U> = (
  U extends unknown ? (u: () => U) => void : never
) extends (u: infer I) => void
  ? I extends () => infer R
    ? R
    : never
  : never

/** The token names among an element shape's keys. */
type TokenNames<Keys> = Exclude<
  Literals<Keys>,
  `$${string}` | `:${string}` | `@${string}` | 'style' | 'container'
>

/** The vocabulary a rejected element key is explained against. */
export type KeyVocabulary = {
  /** Token (and `$`) keys the element shape has. */
  keys: unknown
  parts: string
  declaredStates: string
  builtInStates: string
  /** The system's `states` config, to map a raw selector to its name. */
  stateConfig: unknown
  media: string
  containerNames: string
  containers: string
  /** The system's declared contexts, for `'@within …'` keys. */
  contexts: unknown
  /** Declared width atoms (`>=600px`, `card/>=300px`). */
  widths: string
}

/** What a rejected key's value is checked against, for an element or a map
 *  of parts. */
export type ElementKeyError<K extends string, V extends KeyVocabulary> =
  ElementKeyMessage<K, V> extends infer Message extends string
    ? TonedError<Message>
    : never

type ElementKeyMessage<
  K extends string,
  V extends KeyVocabulary,
> = K extends `@platform${string}`
  ? `Unknown platform block '${K}': write '@platform web' or '@platform native'`
  : K extends `@within${string}`
    ? WithinKeyMessage<K, V['contexts']>
    : K extends `@${infer Body}`
    ? ConditionMessage<
        K,
        FirstBadAtom<
          Body extends `media ${infer Atom}` ? Atom : Body,
          V['media'],
          V['widths'],
          V['containers']
        > extends infer Bad extends string
          ? [Bad] extends [never]
            ? Body
            : Bad
          : Body,
        V['media'],
        V['containers']
      >
    : K extends `[${string}`
      ? RawSelectorMessage<K, V['stateConfig'], V['declaredStates']>
      : K extends `:${infer Body}`
        ? [
            FirstBadState<Body, V['declaredStates'] | V['builtInStates']>,
          ] extends [never]
          ? // Every state is declared, so the key was rejected for where it is: the
            // top of a sheet, where it applies to no part.
            `'${K}' is a declared state, but a state at the top of a sheet applies to no part: write it inside a part ({ ${FirstPart<V['parts']>}: { '${K}': … } }), or name the part ('${FirstPart<V['parts']>}${K}')`
          : StateMessage<
              K,
              FirstBadState<Body, V['declaredStates'] | V['builtInStates']> &
                string,
              V['declaredStates'],
              V['builtInStates']
            >
        : K extends `${string}:${string}` | `${string}~${string}`
          ? CrossKeyMessage<K, V>
          : [Extract<V['parts'], Literals<V['keys']>>] extends [never]
            ? K extends keyof PortableInlineStyle
              ? `'${K}' is a CSS property, not a token: write $style: { ${K}: … }`
              : K extends keyof Properties
                ? `'${K}' is a web-only CSS property, not a token: write '@platform web': { $style: { ${K}: … } }`
                : `Unknown token '${K}'.${DidYouMean<K, TokenNames<V['keys']>>} Tokens: ${QuoteList<TokenNames<V['keys']>>}`
            : `Unknown part '${K}'.${DidYouMean<K, V['parts']>} Declared parts: ${QuoteList<V['parts']>}`
