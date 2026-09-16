import type { ThemeReference } from '../core/values.ts'
import type { PortableTokenStyle } from '../types/style.ts'
import type {
  ResolveContext,
  TokenAlphaConfig,
  TokenConfig,
  Tokens,
  TokenTypeConfig,
} from '../types/tokens.ts'
import { defineToken } from './definers.ts'

/** Phantom schema identity: never read or emitted by the runtime. */
export declare const TOKEN_THEME: unique symbol
export interface ThemeContract<Theme> {
  readonly [TOKEN_THEME]: Theme
}
type ThemeOf<Token> = Token extends ThemeContract<infer Theme> ? Theme : never
type Intersection<U> = (
  U extends unknown
    ? (value: U) => void
    : never
) extends (value: infer I) => void
  ? I
  : never
/** A system must satisfy every typed token's schema, including composed libraries. */
export type SystemTheme<S> = [ThemeOf<S[keyof S]>] extends [never]
  ? Tokens
  : Intersection<ThemeOf<S[keyof S]>> & object

type ThemeConfig<Values extends readonly unknown[], Result, Theme> = Omit<
  TokenConfig<Values, Result>,
  'resolve' | 'pseudoRules'
> & {
  resolve: (
    value: Values[number],
    theme: Theme,
    context?: ResolveContext,
  ) => Result
  pseudoRules?: (
    value: Values[number],
    theme: Theme,
  ) => Record<string, Record<string, string | number>> | undefined
}
type ResultKeys<Result> = Result extends unknown ? keyof Result : never
type ExactOutput<Result, Output> = Result & {
  [K in Exclude<ResultKeys<Result>, keyof Output>]: never
}

/** References must name a compatible member of this factory's theme, not
 * merely a member with the right value type in an unrelated schema. */
type ThemeOutput<Value, Theme> = Value extends ThemeReference<infer Referenced>
  ? {
      [Key in keyof Theme & string]: Theme[Key] extends Referenced
        ? ThemeReference<Theme[Key], Key>
        : never
    }[keyof Theme & string]
  : Value extends object
    ? { [Key in keyof Value]: ThemeOutput<Value[Key], Theme> }
    : Value

export interface ThemeTokenFactory<
  Theme,
  Output extends object = PortableTokenStyle,
> {
  <
    const Values extends readonly unknown[],
    const Result extends ThemeOutput<Output, Theme>,
    const Dynamic extends 'number' | 'string',
    const Extra extends TokenAlphaConfig & TokenTypeConfig = {},
  >(
    config: Omit<ThemeConfig<Values, Result, Theme>, 'resolve' | 'dynamic'> & {
      dynamic: Dynamic
      resolve: (
        value: Values[number] | (Dynamic extends 'number' ? number : string),
        theme: Theme,
        context?: ResolveContext,
      ) => ExactOutput<Result, Output>
    } & Extra,
  ): TokenConfig<Values, Result> &
    Extra & { dynamic: Dynamic } & ThemeContract<Theme>
  <
    const Values extends readonly unknown[],
    const Result extends ThemeOutput<Output, Theme>,
    const Extra extends TokenAlphaConfig & TokenTypeConfig = {},
  >(
    config: ThemeConfig<Values, ExactOutput<Result, Output>, Theme> & Extra,
  ): TokenConfig<Values, Result> & Extra & ThemeContract<Theme>
}

/** Bind a theme schema once, retaining per-token value/result inference. */
export function defineTokenFor<
  Theme extends object,
  Output extends object = PortableTokenStyle,
>(): ThemeTokenFactory<Theme, Output> {
  return defineToken as unknown as ThemeTokenFactory<Theme, Output>
}
