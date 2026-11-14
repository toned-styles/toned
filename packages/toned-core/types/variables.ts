/**
 * Declared CSS variables, in types: a `var(--x)` written as a literal string
 * in a namespaced system's `$style` must name a variable the system owns or
 * one listed in `externalCssVariables`. Any other name is renamed into the
 * namespace and resolves to nothing (see `system/css-variables.ts`, the same
 * rule at runtime).
 *
 * The system owns a custom property the sheet sets (`'--bar': '3rem'` in any
 * `$style` of the sheet) and core's own `--toned-*` / `--toned_*` parameters,
 * bridge variables included.
 *
 * Cost: a `$style` object with no literal `var(` value costs one `Extract`
 * over its value union. The sheet-wide set of set variables is computed only
 * when a name is neither listed nor core's, once per sheet. A system whose
 * list is not a literal tuple (`string[]`) is not checked.
 *
 * @module types/variables
 */
import type { QuoteList, TonedError } from './errors.ts'

/** Type-only key carrying a namespaced system's external variables. */
export declare const CSS_VARIABLES: unique symbol

/** The marker `defineSystem` adds to a namespaced system: the names it lists
 *  in `externalCssVariables` (`never` when none). A named alias, so a
 *  declaration file names it rather than the unexported symbol (TS4023). */
export type NamespacedVariables<E extends string> = {
  readonly [CSS_VARIABLES]: E
}

/** Core's own parameters, never renamed for an author and never listed. */
type CoreVariable = `--toned-${string}` | `--toned_${string}`

/** The name at the start of `Rest`: up to `)`, `,` or a space. */
type NameAt<Rest extends string> = Rest extends `${infer H})${string}`
  ? NameAt<H>
  : Rest extends `${infer H},${string}`
    ? NameAt<H>
    : Rest extends `${infer H} ${string}`
      ? H
      : Rest

/** Every custom-property name a `var()` in `Value` reads. */
export type VariableNames<Value extends string> =
  Value extends `${string}var(${infer Rest}`
    ? (
        Rest extends ` ${infer Trimmed}` ? Trimmed : Rest
      ) extends `--${infer Name}`
      ? `--${NameAt<Name>}` | VariableNames<Rest>
      : VariableNames<Rest>
    : never

/** Every custom property set anywhere in a sheet's rules. `$` members other
 *  than `$style` are values, not rules, so they are not walked. */
export type SetVariables<T> = T extends readonly (infer Entry)[]
  ? SetVariables<Entry>
  : T extends object
    ? {
        [K in keyof T & string]-?: K extends `--${string}`
          ? K
          : K extends `$${string}`
            ? K extends '$style' | `$named$_${string}`
              ? SetVariables<T[K]>
              : never
            : SetVariables<T[K]>
      }[keyof T & string]
    : never

type Unlisted<Value extends string, E extends string> = Exclude<
  VariableNames<Value>,
  E | CoreVariable
>

type Message<
  Value extends string,
  Name extends string,
  E extends string,
> = `'${Value}' names '${Name}', which this system neither sets nor lists, so it would be renamed and resolve to nothing. Add '${Name}' to defineSystem({ externalCssVariables }), or set it in this sheet. External: ${[E] extends [never] ? 'none' : QuoteList<E, 8>}`

/** One `$style` value: `unknown`, or the error naming its first unlisted
 *  variable. A value with a quote or `url(` is left to the runtime check,
 *  which reads only the text outside them. */
type CheckValue<Value, E extends string, Root> = Value extends string
  ? Value extends `${string}${'"' | "'" | 'url('}${string}`
    ? unknown
    : [Unlisted<Value, E>] extends [never]
      ? unknown
      : Exclude<
            Unlisted<Value, E>,
            SetVariables<Root>
          > extends infer Bad extends string
        ? [Bad] extends [never]
          ? unknown
          : TonedError<Message<Value, QuoteFirst<Bad>, E>>
        : unknown
  : unknown

/** One member of a union of names, for the message. */
type QuoteFirst<U extends string> =
  QuoteList<U, 1> extends `'${infer N}'${string}` ? N : U

/**
 * What a written `$style` object's values are checked against: `unknown` for
 * every value, except a literal string whose `var()` names a variable the
 * system neither owns nor lists. `Root` is the whole sheet (`unknown` where
 * there is no sheet to look in: a fragment, variant rules).
 */
export type StyleVariablesCheck<Style, S, Root> = [unknown] extends [Root]
  ? unknown
  : S extends NamespacedVariables<infer E>
    ? string extends E
      ? unknown
      : [Extract<Style[keyof Style], `${string}var(${string}`>] extends [never]
        ? unknown
        : { [K in keyof Style]: CheckValue<Style[K], E, Root> }
    : unknown
