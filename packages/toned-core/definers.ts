import { getConfig } from './config.ts'

import { createStylesheet } from './StyleSheet/StyleSheet.ts'
import {
  type StylesheetInput,
  type StylesheetType,
  SYMBOL_REF,
  type TokenConfig,
  type TokenStyle,
  type TokenSystem,
  type Tokens,
} from './types.ts'

export const SYMBOL_STYLE = Symbol()
export const SYMBOL_ACCESS = Symbol()

export type { TokenSystem }

/**
 * Define a token with its possible values and resolution function.
 *
 * @example
 * ```ts
 * const bgColor = defineToken({
 *   values: ['primary', 'secondary', 'danger'] as const,
 *   resolve: (value, tokens) => ({
 *     backgroundColor: tokens.colors[value]
 *   })
 * })
 * ```
 */
export function defineToken<
  // biome-ignore lint/suspicious/noExplicitAny: ignore
  const Values extends readonly any[],
  // TODO: think about the result type (like, CSSProperties)
  Result extends {},
>(config: TokenConfig<Values, Result>) {
  return config
}

/**
 * Define a unit resolver for custom value transformations.
 *
 * @example
 * ```ts
 * const spacing = defineUnit((value: number, tokens) =>
 *   value * tokens.baseSpacing
 * )
 * ```
 */
export function defineUnit<T>(
  resolver: (value: T, tokens: Tokens) => number | string | undefined,
) {
  return resolver
}

type Breakpoints<O> = { __breakpoints: O }

/**
 * Define a complete token system with all tokens and optional configuration.
 *
 * Returns an object with:
 * - `system` - The token definitions
 * - `t` - Function for inline token styles
 * - `stylesheet` - Function to create stylesheets with variants support
 * - `exec` - Function to resolve tokens to CSS styles
 *
 * @example
 * ```ts
 * const { stylesheet, t } = defineSystem({
 *   bgColor,
 *   textColor,
 *   padding,
 * }, {
 *   breakpoints: { __breakpoints: { sm: 640, md: 768, lg: 1024 } }
 * })
 * ```
 */
export function defineSystem<
  // biome-ignore lint/suspicious/noExplicitAny: generic token system requires flexible types
  const S extends Record<string, TokenConfig<any, any>>,
  // biome-ignore lint/suspicious/noExplicitAny: breakpoints config uses generic parameter
  const C extends { breakpoints?: Breakpoints<any> },
>(system: S, config?: C): TokenSystem<S & C, C> {
  const ref: TokenSystem<S & C, C> = {
    system: { ...system, ...config } as S & C,
    config,
    t: (...values) => {
      // Using Object.assign in loop for better performance than spread accumulator
      const value: Record<string, unknown> = {}
      for (const v of values) {
        Object.assign(value, SYMBOL_STYLE in v ? v[SYMBOL_STYLE] : v)
      }

      if (SYMBOL_REF in value) {
        return value
      }

      const result = {
        [SYMBOL_REF]: ref,
        [SYMBOL_STYLE]: value,
        [SYMBOL_ACCESS]: { ref, value },
        get style() {
          const config = getConfig()
          const tokens = config.getTokens()

          return ref.exec(
            { tokens, useClassName: config.useClassName },
            value as TokenStyle<S & C>,
          ).style
        },
        get className() {
          const config = getConfig()
          const tokens = config.getTokens()

          return ref.exec(
            { tokens, useClassName: config.useClassName },
            value as TokenStyle<S & C>,
          ).className
        },
      }

      // biome-ignore lint/suspicious/noExplicitAny: ignore
      return result as any
    },
    stylesheet: (<T extends StylesheetInput<S & C, T>>(rules: T) => {
      // biome-ignore lint/suspicious/noExplicitAny: complex type intersection requires cast
      return createStylesheet(ref as any, rules)
    }) as StylesheetType<S & C>,
    exec: (config, tokenStyle) => {
      return Object.entries(tokenStyle).reduce<{
        style: object
        className?: string
      }>(
        (acc, [k, v]) => {
          if (!v) return acc

          if (k[0] === ':') {
            return acc
          }

          if (k[0] === '$') {
            return acc
          }

          if (k === 'style') {
            Object.assign(acc.style, v)

            return acc
          }

          if (k === 'className') {
            acc.className ??= ''
            acc.className += ` ${v}`

            return acc
          }

          if (config.useClassName && system[k]?.values.includes(v)) {
            acc.className ??= ''
            acc.className += ` ${k}_${v}`

            return acc
          }

          Object.assign(acc.style, system[k]?.resolve(v, config.tokens))

          return acc
        },
        { style: {}, className: '_' },
      )
    },
  }

  return ref
}
