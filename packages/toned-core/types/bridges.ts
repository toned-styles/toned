/**
 * Bridges, in types: `$bridge` names a declared bridge and its declared
 * properties, and a raw `--toned-b-*` key in `$style` must name one of their
 * parameters. Anything else is a `TonedError` listing the declared ones (the
 * same rule at runtime is in `system/normalize.ts`).
 *
 * Cost: a `$bridge` is walked once per written bridge and property; a
 * `$style` object pays one key `Extract` and builds the parameter names only
 * when it has a `--toned-b-` key.
 *
 * @module types/bridges
 */
import type { DidYouMean, IsLiteral, QuoteList, TonedError } from './errors.ts'
import type { BridgeProperties, DeclaredBridges } from './tokens.ts'

/** `backgroundColor` → `background-color`, as `camelToKebab` writes it. */
type Kebab<
  T extends string,
  Acc extends string = '',
> = T extends `${infer C}${infer R}`
  ? Kebab<R, `${Acc}${C extends Lowercase<C> ? C : `-${Lowercase<C>}`}`>
  : Acc

/** Every parameter custom property the system's bridges read. */
type BridgeParameters<B> = {
  [N in keyof B & string]: B[N] extends {
    readonly properties: readonly (infer P extends string)[]
  }
    ? `--toned-b-${Kebab<N>}-${Kebab<P>}`
    : never
}[keyof B & string]

/** `'placeholder' (color), 'scrollbar' (display, backgroundColor)`. */
type DeclaredSummary<B> = [keyof B] extends [never]
  ? 'none (declare bridges in defineSystem({ conditions: { bridges } }))'
  : QuoteList<keyof B & string>

/** Each written bridge and property against the declared ones. */
export type ValidateBridge<Value, S> = string extends keyof S
  ? unknown
  : Value extends object
    ? {
        [N in keyof Value]: N extends keyof DeclaredBridges<S> & string
          ? Value[N] extends object
            ? {
                [P in keyof Value[N]]: P extends BridgeProperties<
                  DeclaredBridges<S>,
                  N
                >
                  ? unknown
                  : TonedError<`Bridge '${N}' has no property '${P & string}'. Its properties: ${QuoteList<BridgeProperties<DeclaredBridges<S>, N>>}`>
              }
            : unknown
          : TonedError<`Unknown bridge '${N & string}'.${DidYouMean<N & string, keyof DeclaredBridges<S> & string>} Declared bridges: ${DeclaredSummary<DeclaredBridges<S>>}`>
      }
    : unknown

/** A raw `--toned-b-*` key in `$style` that no declared bridge reads. */
export type StyleBridgeCheck<Style, S> = string extends keyof S
  ? unknown
  : [Extract<keyof Style, `--toned-b-${string}`>] extends [never]
    ? unknown
    : {
        [K in keyof Style]: K extends `--toned-b-${string}`
          ? IsLiteral<K> extends true
            ? K extends BridgeParameters<DeclaredBridges<S>>
              ? unknown
              : TonedError<`'${K}' is not a parameter of a declared bridge.${DidYouMean<K, BridgeParameters<DeclaredBridges<S>>>} Write $bridge: { <bridge>: { <property>: value } } beside $style. Declared: ${DeclaredSummary<DeclaredBridges<S>>}`>
            : unknown
          : unknown
      }
