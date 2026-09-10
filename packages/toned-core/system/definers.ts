/**
 * System definition functions.
 *
 * @module system/definers
 */

import { createStylesheet } from '../stylesheet/StyleSheet.ts'
import type {
  Breakpoints,
  Config,
  ExecConfig,
  StylesheetInput,
  StylesheetType,
  TokenConfig,
  TokenStyle,
  TokenSystem,
  Tokens,
} from '../types/index.ts'
import { camelToKebab } from '../utils/css.ts'
import { mergeStyle, toStyleMap } from '../utils/mergeStyle.ts'
import { PSEUDO_CASCADE_ORDER } from '../utils/pseudo.ts'
import { flattenSelectorBlocks } from '../utils/selectorBlocks.ts'
import { SYMBOL_ACCESS, SYMBOL_REF, SYMBOL_STYLE } from '../utils/symbols.ts'
import { type VarChainLink, writeVarChain } from '../utils/varChain.ts'
import { warnOnce } from '../utils/warnOnce.ts'
import { getConfig, resolveModes } from './config.ts'

export type { TokenSystem }

/** One conditional override collected from a `'@bp_prop'` / `':pseudo_prop'` key. */
type Override = { selector: string; value: unknown }

/** `'style'` and its per-selector forms, `'@md_style'` and `':hover_style'`. */
function isStyleKey(key: string): boolean {
  return key === 'style' || key.endsWith('_style')
}

/** Build exec inputs from the active runtime config. */
function execConfigFrom(config: Config): ExecConfig {
  return {
    tokens: config.getTokens(),
    useClassName: config.useClassName,
    ...resolveModes(config),
  }
}

/**
 * Explain that overrides were collected but could not be emitted.
 *
 * Breakpoint and pseudo overrides compile to CSS custom properties, so they
 * need `mediaMode`/`pseudoMode: 'css'`. Under any other mode the keys are
 * dropped and the base token values still apply, which degrades to the
 * non-responsive style rather than emitting unparseable `var()` strings.
 */
function warnModeUnsupported(
  kind: 'breakpoint' | 'pseudo-state',
  option: 'mediaMode' | 'pseudoMode',
  active: Config['mediaMode'] | Config['pseudoMode'],
) {
  warnOnce(
    `Ignored ${kind} overrides; base token values still apply. They compile ` +
      `to CSS custom properties, so they need ${option}: 'css' — the active ` +
      `config is ${option}: ${JSON.stringify(active)}. On React Native, use ` +
      'stylesheet() with useStyles() instead.',
  )
}

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
      const value: Record<string, unknown> & { style?: unknown } = {}
      for (const v of values) {
        // A previous t() result already stores a flattened style; only
        // caller-authored objects carry nested '@bp' / ':pseudo' blocks.
        // Flattening before the merge is what makes repeated arguments for the
        // same selector compose instead of replacing each other wholesale.
        const src = (
          SYMBOL_STYLE in v ? v[SYMBOL_STYLE] : flattenSelectorBlocks(v)
        ) as Record<string, unknown> & { style?: unknown }

        // Raw style maps are the only object-valued keys, and a later argument
        // extends one rather than replacing it. Computing the merges first lets
        // a single assign carry the symbol-keyed internals across too.
        const merged: Record<string, unknown> = {}
        for (const key of Object.keys(src)) {
          if (!isStyleKey(key)) continue
          const combined = mergeStyle(value[key], src[key])
          if (combined !== undefined) merged[key] = combined
        }

        Object.assign(value, src, merged)
      }

      if (SYMBOL_REF in value) {
        return value
      }

      const result = {
        [SYMBOL_REF]: ref,
        [SYMBOL_STYLE]: value,
        [SYMBOL_ACCESS]: { ref, value },
        get style() {
          return ref.exec(
            execConfigFrom(getConfig()),
            value as TokenStyle<S & C>,
          ).style
        },
        get className() {
          return ref.exec(
            execConfigFrom(getConfig()),
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
      // '@bp_prop' / ':pseudo_prop' keys, grouped by the property they target.
      const breakpointOverrides: Record<string, Override[]> = {}
      const pseudoOverrides: Record<string, Override[]> = {}
      let hasBreakpointOverrides = false
      let hasPseudoOverrides = false

      const acc: { style: Record<string, unknown>; className?: string } = {
        style: {},
        className: '_',
      }

      for (const [k, v] of Object.entries(tokenStyle)) {
        if (v == null) continue

        // Selector overrides join on the first underscore, as StyleMatcher
        // writes them: ':hover' + '_' + 'bgColor', '@md' + '_' + 'padding'.
        const underscoreIdx = k.indexOf('_')
        const isPseudo = k[0] === ':'

        if (underscoreIdx > 0 && (isPseudo || k[0] === '@')) {
          const target = isPseudo ? pseudoOverrides : breakpointOverrides
          const prop = k.slice(underscoreIdx + 1)

          target[prop] ??= []
          target[prop].push({ selector: k.slice(0, underscoreIdx), value: v })

          if (isPseudo) hasPseudoOverrides = true
          else hasBreakpointOverrides = true
          continue
        }

        if (isPseudo || k[0] === '$') continue

        if (k === 'style') {
          Object.assign(acc.style, toStyleMap(v))
          continue
        }

        if (k === 'className') {
          acc.className ??= ''
          acc.className += ` ${v}`
          continue
        }

        if (execConfig.useClassName && system[k]?.values.includes(v)) {
          acc.className ??= ''
          acc.className += ` ${k}_${v}`
          continue
        }

        Object.assign(acc.style, system[k]?.resolve(v, execConfig.tokens))
      }

      /**
       * Turn one group of overrides into CSS custom property chains.
       *
       * `order` lists selector keys lowest priority first and is walked in that
       * order, so each link lands outside the previous one and the last match
       * wins. `prefixOf` maps a selector to its space-toggle name, which also
       * namespaces the values it guards.
       *
       * Links are collected per CSS property, not per token prop: two props can
       * resolve to the same property, and a raw `style` block always can. That
       * is what keeps `order` — rather than the caller's key order — deciding
       * which override ends up outermost.
       */
      const applyChains = (
        kind: 'breakpoint' | 'pseudo-state',
        overridesByProp: Record<string, Override[]>,
        order: readonly string[],
        prefixOf: (selector: string) => string,
      ) => {
        // Token props first, raw `style` last, so within one selector the
        // escape hatch sits outside the token chain and wins there — without
        // ever outranking a higher-priority selector.
        const props = Object.entries(overridesByProp).sort(
          ([a], [b]) => Number(a === 'style') - Number(b === 'style'),
        )

        const resolve = (prop: string, value: unknown) =>
          prop === 'style'
            ? toStyleMap(value)
            : system[prop]?.resolve(value, execConfig.tokens)

        // Resolve the base values, and report overrides that cannot contribute.
        // Token resolvers need not handle an absent value, so only a base the
        // caller actually set is resolved. Bases matter because className mode
        // keeps them out of acc.style.
        const bases: Record<string, unknown> = {}
        for (const [prop, overrides] of props) {
          const baseValue = prop === 'style' ? null : tokenStyle[prop]
          if (baseValue != null) Object.assign(bases, resolve(prop, baseValue))

          for (const { selector } of overrides) {
            // Check the selector before the prop: a breakpoint named
            // `small_screen` splits into the selector '@small', and naming that
            // is far more useful than reporting 'screen_padding' as a token.
            if (!order.includes(selector)) {
              warnOnce(
                `Ignored the ${kind} override '${selector}'; base token ` +
                  'values still apply. This system supports ' +
                  `${order.join(', ')}.`,
              )
            } else if (prop !== 'style' && prop[0] !== '$' && !system[prop]) {
              warnOnce(
                `Ignored the ${kind} override '${selector}_${prop}'; base ` +
                  `token values still apply. '${prop}' is not a token of this ` +
                  'system. Selector blocks are one level deep, so a selector ' +
                  'nested inside one lands here too.',
              )
            }
          }
        }

        // Walking `order` outermost-last means insertion order is already the
        // cascade. Keying within a property collapses two token props that
        // resolve to it the way their base values merge — last wins — instead
        // of nesting a variable inside its own fallback.
        const links = new Map<string, Map<string, VarChainLink>>()
        for (const selector of order) {
          for (const [prop, overrides] of props) {
            const override = overrides.find((o) => o.selector === selector)
            if (!override) continue

            const suffix = prop === 'style' ? '__style' : undefined
            for (const [cssProp, value] of Object.entries(
              resolve(prop, override.value) ?? {},
            )) {
              const forProp = links.get(cssProp) ?? new Map()
              links.set(cssProp, forProp)
              forProp.set(selector + (suffix ?? ''), {
                prefix: prefixOf(selector),
                value,
                suffix,
              })
            }
          }
        }

        for (const [cssProp, forProp] of links) {
          // Prefer whatever is already accumulated: pseudo chains compose on
          // top of breakpoint chains for the same property. A null chain means
          // nothing linked, so the base is left exactly as it was — still a
          // number, for `applyStyles` to unit-suffix as usual.
          const chain = writeVarChain(
            acc.style,
            cssProp,
            acc.style[cssProp] ?? bases[cssProp],
            [...forProp.values()],
          )

          if (chain !== null) acc.style[cssProp] = chain
        }
      }

      // Breakpoint overrides. Anything collected but not emitted is reported
      // rather than dropped in silence — the base token values still apply.
      const bpValues = config?.breakpoints?.__breakpoints as
        | Record<string, number>
        | undefined

      if (hasBreakpointOverrides) {
        if (execConfig.mediaMode !== 'css') {
          warnModeUnsupported('breakpoint', 'mediaMode', execConfig.mediaMode)
        } else if (!bpValues) {
          warnOnce(
            'Ignored breakpoint overrides; base token values still apply. ' +
              'This system declares no breakpoints — pass them to ' +
              'defineSystem(tokens, { breakpoints }).',
          )
        } else {
          // Ascending pixel value, so the widest breakpoint wins. Toggle names
          // are kebab-cased to match the `@media` rules `dom/generate.ts`
          // emits; a camelCase breakpoint would otherwise reference a custom
          // property that is never declared.
          applyChains(
            'breakpoint',
            breakpointOverrides,
            Object.entries(bpValues)
              .sort(([, a], [, b]) => a - b)
              .map(([key]) => `@${key}`),
            (selector) => `media-${camelToKebab(selector.slice(1))}`,
          )
        }
      }

      // Pseudo-state overrides, applied after breakpoints so an interaction
      // outranks a media query for the same property.
      if (hasPseudoOverrides) {
        if (execConfig.pseudoMode !== 'css') {
          warnModeUnsupported(
            'pseudo-state',
            'pseudoMode',
            execConfig.pseudoMode,
          )
        } else {
          applyChains(
            'pseudo-state',
            pseudoOverrides,
            PSEUDO_CASCADE_ORDER,
            (selector) => `toned_${selector.slice(1)}`,
          )
        }
      }

      return acc
    },
  }

  return ref
}
