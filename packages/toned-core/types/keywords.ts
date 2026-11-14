/**
 * CSS keyword values, in types: in a web `$style`, a literal string for a
 * property whose values are a closed keyword set must be one of its keywords.
 *
 * csstype types most CSS properties as their keywords plus `string & {}`, so
 * `cursor: 'pointr'` is a valid `Property.Cursor` and a typo is silent. For
 * the properties in {@link KeywordGrammars}, a literal string value is
 * accepted when it is:
 *
 * - one of the property's keywords (csstype's literal members, which include
 *   the CSS-wide `inherit`, `initial`, `unset`, `revert`, `revert-layer`,
 *   plus the vendor values csstype omits, such as `display: '-webkit-box'`),
 *   compared without case, as CSS does;
 * - for a property that takes several keywords (`display: 'inline flex'`,
 *   `alignItems: 'safe center'`), a space-separated list of them;
 * - any value with a function or a quoted string in it (`var(--x)`, `env()`,
 *   `url(hand.svg), pointer`, `"…"`), which is left to the browser.
 *
 * Anything else is a `TonedError` naming the property, the word, the closest
 * keyword and the keywords. A value typed `string` (computed at runtime) is
 * not checked. A property csstype already types as a closed union
 * (`position`, `visibility`, `pointerEvents`, `boxSizing`, …) needs no row:
 * the compiler rejects a typo there and suggests the keyword itself.
 *
 * The check applies where the declared style type accepts any string for the
 * property, which is web CSS (`'@platform web'`, or a web-only system's
 * `$style`). Portable and native styles are closed unions already.
 *
 * To check another property, add a row: its keywords (usually
 * `Keywords<Property.X>`) and whether it takes several. Leave out a property
 * whose grammar has a free identifier, such as `listStyleType` (a custom
 * counter style is any name), or the check would reject valid CSS.
 *
 * Cost: a `$style` object with no key in the table costs one `Extract` over
 * its keys; a key in the table, one lookup in the declared style and one
 * walk of its value's words. The message is built only for a rejected value.
 *
 * @module types/keywords
 */
import type { DataType, Globals, Property } from 'csstype'

import type { DidYouMean, IsLiteral, QuoteList, TonedError } from './errors.ts'

/** The keywords of a csstype property type: its literal string members,
 *  without the `string & {}` that admits any string. */
export type Keywords<T> = T extends string
  ? string extends T
    ? never
    : T
  : never

/** What a property accepts: its keywords, and whether a value may list
 *  several, space-separated. */
type Grammar<Words extends string, Multi extends boolean = false> = {
  words: Words
  multi: Multi
}

/** `<overflow-position>` and `<baseline-position>` prefixes of the box
 *  alignment properties (`safe center`, `first baseline`). */
type AlignmentPrefix = 'safe' | 'unsafe' | 'first' | 'last'

type AlignWords =
  | Keywords<Property.AlignContent | Property.AlignItems | Property.AlignSelf>
  | AlignmentPrefix
type JustifyWords =
  | Keywords<
      Property.JustifyContent | Property.JustifyItems | Property.JustifySelf
    >
  | AlignmentPrefix

type Angle = `${number}${'deg' | 'grad' | 'rad' | 'turn'}`

/** Vendor `display` values csstype leaves out: the legacy flexbox boxes a
 *  line clamp (`-webkit-line-clamp`) needs. The other table properties'
 *  vendor values in use (`-webkit-center`, `-webkit-grab`, `-ms-pan-x`, …)
 *  are csstype keywords already. */
type VendorDisplay = '-webkit-box' | '-webkit-inline-box'

/**
 * The properties whose literal values are checked, and their grammars. Each
 * is open (`string & {}`) in csstype; the words are csstype's keywords plus
 * what the grammar adds.
 */
export interface KeywordGrammars {
  alignContent: Grammar<AlignWords, true>
  alignItems: Grammar<AlignWords, true>
  alignSelf: Grammar<AlignWords, true>
  borderStyle: Grammar<Keywords<Property.BorderStyle>, true>
  cursor: Grammar<Keywords<Property.Cursor>>
  display: Grammar<Keywords<Property.Display> | VendorDisplay, true>
  flexFlow: Grammar<Keywords<Property.FlexFlow>, true>
  fontStyle: Grammar<Keywords<Property.FontStyle> | Angle, true>
  fontWeight: Grammar<
    Keywords<Property.FontWeight | DataType.FontWeightAbsolute> | `${number}`
  >
  justifyContent: Grammar<JustifyWords, true>
  justifyItems: Grammar<JustifyWords, true>
  justifySelf: Grammar<JustifyWords, true>
  overflow: Grammar<Keywords<Property.Overflow>, true>
  overscrollBehavior: Grammar<Keywords<Property.OverscrollBehavior>, true>
  placeContent: Grammar<AlignWords | JustifyWords, true>
  placeItems: Grammar<AlignWords | JustifyWords, true>
  placeSelf: Grammar<AlignWords | JustifyWords, true>
  textAlign: Grammar<Keywords<Property.TextAlign>>
  textDecorationLine: Grammar<Keywords<Property.TextDecorationLine>, true>
  textOverflow: Grammar<Keywords<Property.TextOverflow>, true>
  textTransform: Grammar<Keywords<Property.TextTransform>, true>
  textWrap: Grammar<Keywords<Property.TextWrap>, true>
  touchAction: Grammar<Keywords<Property.TouchAction>, true>
  whiteSpace: Grammar<Keywords<Property.WhiteSpace>, true>
}

/** The first word of `Value` (lower-cased) that is not in `G`, or `never`. */
type FirstBadWord<
  Value extends string,
  G extends Grammar<string, boolean>,
> = G['multi'] extends true
  ? Value extends `${infer Head} ${infer Tail}`
    ? Head extends ''
      ? FirstBadWord<Tail, G>
      : Lowercase<Head> extends G['words']
        ? FirstBadWord<Tail, G>
        : Head
    : Value extends '' | G['words']
      ? never
      : Lowercase<Value> extends G['words']
        ? never
        : Value
  : Value extends G['words']
    ? never
    : Lowercase<Value> extends G['words']
      ? never
      : Value

/** The keywords a message lists: no vendor prefixes, no CSS-wide keywords. */
type Listed<Words> = Exclude<Words, `-${string}` | Globals>

type Message<
  P extends string,
  Value extends string,
  Bad extends string,
  Words extends string,
> = `'${Bad}'${Bad extends Value ? '' : ` in '${Value}'`} is not a '${P}' keyword.${DidYouMean<Lowercase<Bad>, Listed<Words>>} Keywords: ${QuoteList<Listed<Words>, 8>}, or a CSS-wide keyword, var() or another function`

/** The message for each member of `Value` that is not a keyword, or
 *  `never`. Distributes, so each member of a union is checked. */
type Rejected<Value, P extends keyof KeywordGrammars> = Value extends
  | KeywordGrammars[P]['words']
  | number
  ? never
  : Value extends string
    ? IsLiteral<Value> extends false
      ? never
      : Value extends `${string}${'(' | '"' | "'"}${string}`
        ? never
        : FirstBadWord<Value, KeywordGrammars[P]> extends infer Bad extends
              string
          ? [Bad] extends [never]
            ? never
            : Message<P, Value, Bad, KeywordGrammars[P]['words']>
          : never
    : never

/** One value: `unknown`, or the error naming its first word that is not a
 *  keyword (built outside the distribution, so a union with one typo is
 *  rejected rather than absorbed by its valid members' `unknown`). */
type CheckValue<Value, P extends keyof KeywordGrammars> =
  Rejected<Value, P> extends infer M extends string
    ? [M] extends [never]
      ? unknown
      : TonedError<M>
    : unknown

/** Whether the declared style type takes any string for `K` (web CSS). */
type OpenIn<Allowed, K> = K extends keyof Allowed
  ? string extends Allowed[K]
    ? true
    : false
  : false

/**
 * What a written `$style` object's values are checked against: `unknown`,
 * except a literal value of a {@link KeywordGrammars} property that the
 * declared style (`Allowed`) types as any string and that is not a keyword.
 */
export type StyleKeywordCheck<Style, Allowed> = [
  Extract<keyof Style, keyof KeywordGrammars>,
] extends [never]
  ? unknown
  : {
      [K in keyof Style]: K extends keyof KeywordGrammars
        ? OpenIn<Allowed, K> extends true
          ? CheckValue<Style[K], K>
          : unknown
        : unknown
    }
