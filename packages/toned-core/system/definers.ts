/**
 * System definition functions.
 *
 * @module system/definers
 */

import { createStylesheet } from '../stylesheet/StyleSheet.ts'
import type {
  Breakpoints,
  StylesheetInput,
  StylesheetType,
  TokenConfig,
  TokenStyle,
  TokenSystem,
  Tokens,
} from '../types/index.ts'
import { camelToKebab } from '../utils/css.ts'
import { SYMBOL_ACCESS, SYMBOL_REF, SYMBOL_STYLE } from '../utils/symbols.ts'
import { getConfig } from './config.ts'

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
  // biome-ignore lint/suspicious/noExplicitAny: Values must accept any const array for token definitions
  const Values extends readonly any[],
  // Result type is intentionally loose - could be CSSProperties but allows custom token styles
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

      // biome-ignore lint/suspicious/noExplicitAny: return type is dynamic based on S & C intersection
      return result as any
    },
    stylesheet: (<T extends StylesheetInput<S & C, T>>(rules: T) => {
      // biome-ignore lint/suspicious/noExplicitAny: complex type intersection requires cast
      return createStylesheet(ref as any, rules)
    }) as StylesheetType<S & C>,
    exec: (execConfig, tokenStyle) => {
      // Collect @breakpoint_prop entries for CSS variable mode
      const breakpointOverrides: Record<
        string,
        Array<{ breakpoint: string; tokenKey: string; value: unknown }>
      > = {}

      const acc: { style: Record<string, unknown>; className?: string } = {
        style: {},
        className: '_',
      }

      for (const [k, v] of Object.entries(tokenStyle)) {
        if (!v) continue

        if (k[0] === ':' || k[0] === '$') continue

        if (k === 'style') {
          Object.assign(acc.style, v)
          continue
        }

        if (k === 'className') {
          acc.className ??= ''
          acc.className += ` ${v}`
          continue
        }

        // Handle @breakpoint_prop keys from CSS media mode
        if (k[0] === '@' && k.includes('_')) {
          const underscoreIdx = k.indexOf('_')
          const breakpoint = k.slice(0, underscoreIdx) // e.g. '@sm'
          const prop = k.slice(underscoreIdx + 1) // e.g. 'bgColor'

          breakpointOverrides[prop] ??= []
          breakpointOverrides[prop].push({
            breakpoint,
            tokenKey: prop,
            value: v,
          })
          continue
        }

        if (execConfig.useClassName && system[k]?.values.includes(v)) {
          acc.className ??= ''
          acc.className += ` ${k}_${v}`
          continue
        }

        Object.assign(acc.style, system[k]?.resolve(v, execConfig.tokens))
      }

      // Process breakpoint overrides into CSS variable fallback chains
      const bpValues = config?.breakpoints?.__breakpoints as
        | Record<string, number>
        | undefined
      if (bpValues && Object.keys(breakpointOverrides).length > 0) {
        // Sort breakpoints by pixel value (ascending) for proper cascade
        const sortedBps = Object.entries(bpValues).sort(([, a], [, b]) => a - b)

        for (const [prop, overrides] of Object.entries(breakpointOverrides)) {
          // Resolve base value (already in acc.style from the token system)
          const resolvedBase = system[prop]?.resolve(
            tokenStyle[prop],
            execConfig.tokens,
          )
          if (!resolvedBase) continue

          // Get CSS property names from the resolved base
          for (const cssProp in resolvedBase) {
            const kebabProp = camelToKebab(cssProp)
            const baseValue = resolvedBase[cssProp]

            // Generate --media-bp__css-prop custom properties for each override
            for (const { breakpoint, value } of overrides) {
              const bpName = breakpoint.slice(1) // remove @
              const resolved = system[prop]?.resolve(value, execConfig.tokens)
              if (!resolved?.[cssProp]) continue

              const varName = `--media-${bpName}__${kebabProp}`
              acc.style[varName] = `var(--media-${bpName}) ${resolved[cssProp]}`
            }

            // Build fallback chain: highest breakpoint first
            // var(--media-xl__bg, var(--media-lg__bg, var(--media-md__bg, base)))
            let chain = String(baseValue)
            for (const [bpKey] of sortedBps) {
              const bpAtKey = `@${bpKey}`
              if (overrides.some((o) => o.breakpoint === bpAtKey)) {
                const varName = `--media-${bpKey}__${kebabProp}`
                chain = `var(${varName}, ${chain})`
              }
            }

            acc.style[cssProp] = chain
          }
        }
      }

      return acc
    },
  }

  return ref
}
