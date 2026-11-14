/**
 * Context markers, in types: a provider's `$context` names a declared
 * context (or a context and one of its values), and a descendant's
 * `'@within …'` key names a declared context, value or offered state.
 * Anything else is a `TonedError` naming the fix (the same rules at runtime
 * are in `system/contexts.ts`).
 *
 * In a system whose `targets` include `'native'`, a context STATE key
 * (`'@within card:hover'`) is only offered inside `'@platform web'`: native
 * has no provider state to read across components.
 *
 * Cost: the key union is one member per context, value and state, built once
 * per system; a rejected key pays for its message only.
 *
 * @module types/contexts
 */
import type { Platform } from './config.ts'
import type { DidYouMean, IsLiteral, QuoteList, TonedError } from './errors.ts'
import type { TargetsOf } from './targets.ts'

/** The contexts a system declares, by name (`{}` when it declares none). */
export type DeclaredContexts<S> = S extends {
  readonly contexts: infer C extends Record<string, object>
}
  ? C
  : {}

type ValuesOf<D> = D extends {
  readonly values: readonly (infer V extends string)[]
}
  ? V
  : never

type StatesOf<D> = D extends {
  readonly states: readonly (infer V extends string)[]
}
  ? V
  : never

/** What `$context` takes: a declared context, or a context and value. */
export type ContextMarker<S> = {
  [N in keyof DeclaredContexts<S> & string]:
    | N
    | `${N}=${ValuesOf<DeclaredContexts<S>[N]>}`
}[keyof DeclaredContexts<S> & string]

/** Whether context states may be read here: not in a native target. */
type StatesReadable<S, Host> = Host extends 'web'
  ? true
  : 'native' extends TargetsOf<S>
    ? false
    : true

/** The `'@within …'` keys a part may write, inside a `Host` block. */
export type WithinKey<S, Host extends Platform | undefined> = {
  [N in keyof DeclaredContexts<S> & string]:
    | `@within ${N}`
    | `@within ${N}=${ValuesOf<DeclaredContexts<S>[N]>}`
    | (StatesReadable<S, Host> extends true
        ? `@within ${N}:${StatesOf<DeclaredContexts<S>[N]>}`
        : never)
}[keyof DeclaredContexts<S> & string]

type Names<C> = keyof C & string

type DeclaredSummary<C> = [Names<C>] extends [never]
  ? 'none (declare them in defineSystem({ conditions: { contexts } }))'
  : QuoteList<Names<C>>

type Bracketed<U, Extra extends string> = `[${QuoteList<U | Extra, 12>}]`

type UnknownContext<
  N extends string,
  Where extends string,
  C,
> = `Unknown context '${N}' in ${Where}.${DidYouMean<N, Names<C>>} Declared contexts: ${DeclaredSummary<C>}`

/** The message for a written `'@within …'` key the shape rejected. */
export type WithinKeyMessage<
  K extends string,
  C,
> = K extends `@within ${infer Body}`
  ? Body extends `${infer N}=${infer V}`
    ? N extends Names<C>
      ? V extends ValuesOf<C[N]>
        ? `'${K}' is declared; it was rejected for where it is written`
        : `Context '${N}' has no value '${V}' in '${K}'.${DidYouMean<V, ValuesOf<C[N]>>} Its values: ${[ValuesOf<C[N]>] extends [never] ? 'none' : QuoteList<ValuesOf<C[N]>>}. Declare it: contexts: { ${N}: { values: ${Bracketed<ValuesOf<C[N]>, V>} } }`
      : UnknownContext<N, `'${K}'`, C>
    : Body extends `${infer N}:${infer St}`
      ? N extends Names<C>
        ? St extends StatesOf<C[N]>
          ? `'${K}' reads a provider state, and this system's 'native' target has no provider state across components: put it under '@platform web', or drop the native target`
          : `Context '${N}' does not offer state '${St}' in '${K}'. Declare it: contexts: { ${N}: { states: ${Bracketed<StatesOf<C[N]>, St>} } }`
        : UnknownContext<N, `'${K}'`, C>
      : Body extends Names<C>
        ? `'${K}' is declared; it was rejected for where it is written`
        : UnknownContext<Body, `'${K}'`, C>
  : `'${K}' is not a context condition: write '@within <context>', '@within <context>=<value>' or '@within <context>:<state>'`

type MarkerError<M, S> = M extends string
  ? IsLiteral<M> extends true
    ? M extends ContextMarker<S>
      ? unknown
      : M extends `${infer N}=${infer V}`
        ? N extends Names<DeclaredContexts<S>>
          ? TonedError<`Context '${N}' has no value '${V}' in $context. Its values: ${QuoteList<ValuesOf<DeclaredContexts<S>[N]>>}`>
          : TonedError<UnknownContext<N, '$context', DeclaredContexts<S>>>
        : M extends `${string}:${string}`
          ? TonedError<`$context '${M}' is not a marker: a state is the provider's own and is never set; write the context ('${M extends `${infer N}:${string}` ? N : M}')`>
          : TonedError<UnknownContext<M, '$context', DeclaredContexts<S>>>
    : unknown
  : unknown

/** `$context` inside a condition: a marker is static. */
export type ContextInCondition =
  TonedError<"$context is static and cannot change inside a condition: set it on the part, or in a variant block ([$.<axis>(value)]: { Part: { $context: '…' } })">

/** A written `$context`: each marker against the declared contexts. */
export type ValidateContextMarker<Value, Allowed, S> = [
  NonNullable<Allowed>,
] extends [ContextInCondition]
  ? ContextInCondition
  : Value extends readonly unknown[]
    ? { [I in keyof Value]: MarkerError<Value[I], S> }
    : MarkerError<Value, S>
