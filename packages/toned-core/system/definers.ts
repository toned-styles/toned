/**
 * System definition functions.
 *
 * @module system/definers
 */

import { createStylesheet } from '../stylesheet/StyleSheet.ts'
import { isAnimationDefinition } from '../types/index.ts'
import type {
  AnimationInput,
  Breakpoints,
  BridgeConfig,
  ResolveContext,
  StylesheetInput,
  StylesheetType,
  TokenAlphaConfig,
  TokenConfig,
  TokenTypeConfig,
  TokenStyle,
  TokenSystem,
  Tokens,
} from '../types/index.ts'
import {
  DEFAULT_ALPHA_STEPS,
  alphaVarName,
  alphaWrappable,
  applyAlpha,
  splitAlphaValue,
  withAlphaExpr,
} from '../utils/alpha.ts'
import { camelToKebab } from '../utils/css.ts'
import { resolvePlatformKeys } from '../utils/platform.ts'
import { mergeStyle } from '../utils/mergeStyle.ts'
import { PSEUDO_CASCADE_ORDER } from '../utils/pseudo.ts'
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
  // Preserved so TokenStyle can see whether the token declared an alphaChannel
  // and widen its accepted values to `'value/alpha'`.
  const Extra extends TokenAlphaConfig & TokenTypeConfig = {},
>(
  config: TokenConfig<Values, Result> & Extra,
): TokenConfig<Values, Result> & Extra {
  return config
}

/**
 * Declare the system's named animations — the motion analogue of the token
 * set: an enumerated, system-compiled vocabulary rather than per-component
 * keyframes. `generate()` emits `@keyframes toned_<name>` for each, and the
 * returned `animation` token resolves a name to its `animation-name`, so a
 * stylesheet says `animation: 'fade-in'` (composable with duration/easing
 * however the host tokenizes them). Platforms without CSS map the same names
 * to their own motion backends.
 *
 * @example
 * ```ts
 * const motion = defineAnimations({
 *   'fade-in': { from: { opacity: 0 }, to: { opacity: 1 } },
 * })
 * const system = defineSystem(
 *   { ...tokens, animation: motion.animation },
 *   { breakpoints, animations: motion.animations },
 * )
 * ```
 */
export function defineAnimations<
  const A extends Record<string, AnimationInput>,
>(animations: A) {
  const ms = (v: number | string | undefined) =>
    v === undefined ? undefined : typeof v === 'number' ? `${v}ms` : v
  return {
    animations,
    animation: defineToken({
      values: Object.keys(animations) as (keyof A & string)[],
      resolve: (value) => {
        const def = animations[value]
        const timing =
          def !== undefined && isAnimationDefinition(def) ? def : undefined
        // Timing compiles INTO the animation's class, so `animation: 'pulse'`
        // is self-contained; a consumer can still override any piece.
        return {
          animationName: `toned_${value}`,
          ...(timing?.duration !== undefined && {
            animationDuration: ms(timing.duration),
          }),
          ...(timing?.easing !== undefined && {
            animationTimingFunction: timing.easing,
          }),
          ...(timing?.delay !== undefined && {
            animationDelay: ms(timing.delay),
          }),
          ...(timing?.iterations !== undefined && {
            animationIterationCount: String(timing.iterations),
          }),
          ...(timing?.direction !== undefined && {
            animationDirection: timing.direction,
          }),
          ...(timing?.fillMode !== undefined && {
            animationFillMode: timing.fillMode,
          }),
        }
      },
    }),
  }
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

/**
 * Resolve a token value with alpha awareness: `'primary/90'` on an
 * alpha-channelled token resolves the base and washes the channel values.
 * Every resolution site (main loop, breakpoint chains, pseudo chains) routes
 * through this so the modifier works uniformly.
 */
function resolveTokenValue(
  // biome-ignore lint/suspicious/noExplicitAny: internal dynamic token shape
  tokenCfg: any,
  value: unknown,
  tokens: Tokens,
  ctx?: ResolveContext,
  // biome-ignore lint/suspicious/noExplicitAny: dynamic result shape
): Record<string, any> | undefined {
  if (!tokenCfg) return undefined
  if (tokenCfg.alphaChannel) {
    const parsed = splitAlphaValue(value)
    if (parsed && tokenCfg.values.includes(parsed.base)) {
      const resolved = tokenCfg.resolve(parsed.base, tokens, ctx) as Record<
        string,
        unknown
      >
      // biome-ignore lint/suspicious/noExplicitAny: dynamic result shape
      const out: Record<string, any> = {}
      for (const prop in resolved) {
        const propValue = resolved[prop]
        out[prop] =
          tokenCfg.alphaChannel.includes(prop) && alphaWrappable(propValue)
            ? applyAlpha(propValue, parsed.alpha / 100)
            : propValue
      }
      return out
    }
  }
  return tokenCfg.resolve(value, tokens, ctx)
}

/**
 * Bring a chain value to CLASS FIDELITY: the atomic class for an
 * alpha-channel property paints `rgb(from X r g b / calc(alpha *
 * var(--toned-alpha-…, 1)))`, so a breakpoint/pseudo chain (whose values ride
 * the element's inline style instead) must paint the very same expression.
 * Without this the chain's raw value differs from the class's wrapped one by
 * the browser's RCS serialization (measured: a hairline border shifted by
 * 1/255 alpha the moment a state override put it on a chain) and ignores a
 * caller's alpha parameter besides.
 */
function resolveForChain(
  // biome-ignore lint/suspicious/noExplicitAny: internal dynamic token shape
  tokenCfg: any,
  value: unknown,
  tokens: Tokens,
  ctx?: ResolveContext,
  // biome-ignore lint/suspicious/noExplicitAny: dynamic result shape
): Record<string, any> | undefined {
  const resolved = resolveTokenValue(tokenCfg, value, tokens, ctx)
  if (!resolved || !tokenCfg?.alphaChannel) return resolved
  // biome-ignore lint/suspicious/noExplicitAny: dynamic result shape
  const out: Record<string, any> = {}
  for (const prop in resolved) {
    const propValue = resolved[prop]
    out[prop] =
      tokenCfg.alphaChannel.includes(prop) &&
      alphaWrappable(propValue) &&
      // An alpha-modifier value ('primary/90') is already wrapped.
      !String(propValue).startsWith('rgb(from ')
        ? withAlphaExpr(String(propValue), `var(${alphaVarName(prop)}, 1)`)
        : propValue
  }
  return out
}

export function defineSystem<
  // biome-ignore lint/suspicious/noExplicitAny: generic token system requires flexible types
  const S extends Record<string, TokenConfig<any, any>>,
  const C extends {
    // biome-ignore lint/suspicious/noExplicitAny: breakpoints config uses generic parameter
    breakpoints?: Breakpoints<any>
    animations?: Record<string, AnimationInput>
    bridges?: Record<string, BridgeConfig>
    states?: Record<string, string>
  },
>(system: S, config?: C): TokenSystem<S & C, C> {
  const ref: TokenSystem<S & C, C> = {
    system: { ...system, ...config } as S & C,
    config,
    t: (...values) => {
      const value: Record<string, unknown> & { style?: unknown } = {}
      for (const v of values) {
        const src = (SYMBOL_STYLE in v ? v[SYMBOL_STYLE] : v) as Record<
          string,
          unknown
        > & { style?: unknown }
        // Deep-merge the `style` object so later arguments extend earlier
        // entries instead of replacing them. A shallow copy would drop style
        // props set by earlier arguments.
        const prevStyle = value.style
        Object.assign(value, src)
        const mergedStyle = mergeStyle(prevStyle, src.style)
        if (mergedStyle !== undefined) value.style = mergedStyle
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
            {
              tokens,
              useClassName: config.useClassName,
              platform: config.platform,
            },
            resolvePlatformKeys(value, config.platform) as TokenStyle<S & C>,
          ).style
        },
        get className() {
          const config = getConfig()
          const tokens = config.getTokens()

          return ref.exec(
            {
              tokens,
              useClassName: config.useClassName,
              platform: config.platform,
            },
            resolvePlatformKeys(value, config.platform) as TokenStyle<S & C>,
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
      // Threaded into every token's resolve so a token can branch per platform
      // (elevation → box-shadow on web, shadow* on native). Defaults to 'web'
      // when no binding set a platform — the same baseline generate.ts uses, so
      // an inline exec and the generated CSS agree. See ResolveContext.
      const ctx: ResolveContext = { platform: execConfig.platform ?? 'web' }
      // Declared states extend the pseudo cascade, OUTERMOST (they win over the
      // interaction pseudos): a `data-state=on` paint beats `:hover`. Config
      // order decides precedence among states.
      const stateAliases = config?.states ? Object.keys(config.states) : []
      const stateOrder = stateAliases.map((k) => `:${k}` as const)
      // Their cross-element counterparts (`'source:<alias>'` → `:src-<alias>` on a
      // descendant target) sit INNERMOST, below every self state/pseudo, so a
      // target that also styles its own state keeps the more specific answer —
      // exactly as `:src-hover` sits below `:hover`.
      const srcStateOrder = stateAliases.map((k) => `:src-${k}` as const)
      const cascadeOrder = [
        ...srcStateOrder,
        ...PSEUDO_CASCADE_ORDER,
        ...stateOrder,
      ]
      // Collect @breakpoint_prop entries for CSS variable mode
      const breakpointOverrides: Record<
        string,
        Array<{ breakpoint: string; tokenKey: string; value: unknown }>
      > = {}

      // Collect :pseudo_prop entries for CSS pseudo mode
      const pseudoOverrides: Record<
        string,
        Array<{ pseudo: string; tokenKey: string; value: unknown }>
      > = {}

      const acc: { style: Record<string, unknown>; className?: string } = {
        style: {},
        className: '_',
      }

      for (const [k, v] of Object.entries(tokenStyle)) {
        if (v == null) continue

        // Nested pseudo/state/breakpoint BLOCKS (`':hover': {…}`, `'@md':
        // {…}`) reach exec un-flattened on the `t()` path — the stylesheet
        // path flattens them into `':hover_prop'`/`'@md_prop'` keys before
        // exec ever sees them. Flatten here so both paths agree; before this,
        // `t()` silently dropped every such block.
        if (
          (k[0] === ':' || k[0] === '@') &&
          !k.includes('_') &&
          v &&
          typeof v === 'object'
        ) {
          for (const [prop, val] of Object.entries(
            v as Record<string, unknown>,
          )) {
            if (val == null) continue
            if (k[0] === '@') {
              breakpointOverrides[prop] ??= []
              breakpointOverrides[prop].push({
                breakpoint: k,
                tokenKey: prop,
                value: val,
              })
            } else {
              pseudoOverrides[prop] ??= []
              pseudoOverrides[prop].push({ pseudo: k, tokenKey: prop, value: val })
            }
          }
          continue
        }

        // Handle :pseudo_prop keys from CSS pseudo mode
        if (k[0] === ':' && k.includes('_')) {
          const underscoreIdx = k.indexOf('_')
          const pseudo = k.slice(0, underscoreIdx) // e.g. ':hover'
          const prop = k.slice(underscoreIdx + 1) // e.g. 'bgColor'

          pseudoOverrides[prop] ??= []
          pseudoOverrides[prop].push({
            pseudo,
            tokenKey: prop,
            value: v,
          })
          continue
        }

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

        const tokenCfg = system[k] as
          | (TokenConfig<readonly unknown[], {}> & TokenAlphaConfig)
          | undefined

        // The alpha modifier: `'primary/90'` on a token that declared an
        // alphaChannel. See utils/alpha.ts for the whole mechanism.
        if (tokenCfg?.alphaChannel) {
          const parsed = splitAlphaValue(v)
          if (parsed && tokenCfg.values.includes(parsed.base)) {
            if (
              execConfig.useClassName &&
              tokenCfg.values.includes(parsed.base)
            ) {
              const steps = tokenCfg.alphaSteps ?? DEFAULT_ALPHA_STEPS
              acc.className ??= ''
              acc.className += ` ${k}_${parsed.base}`
              if (steps.includes(parsed.alpha)) {
                // Enumerated step: the static class sets the parameter.
                acc.className += ` ${k}$${parsed.alpha}`
              } else {
                // Off-scale: one inline PARAMETER custom property — never the
                // painted property, so a caller's className still wins it.
                for (const prop of tokenCfg.alphaChannel) {
                  acc.style[alphaVarName(prop)] = String(parsed.alpha / 100)
                }
              }
              continue
            }
            // Inline path (no className mode, or native): resolve the base and
            // alpha the channel values directly — var() refs route through
            // relative colour syntax, literals compute an rgba.
            const resolved = tokenCfg.resolve(
              parsed.base,
              execConfig.tokens,
              ctx,
            ) as Record<string, unknown>
            for (const prop in resolved) {
              const value = resolved[prop]
              if (
                tokenCfg.alphaChannel.includes(prop) &&
                alphaWrappable(value)
              ) {
                resolved[prop] = applyAlpha(value, parsed.alpha / 100)
              }
            }
            Object.assign(acc.style, resolved)
            continue
          }
        }

        if (execConfig.useClassName && tokenCfg?.values.includes(v)) {
          acc.className ??= ''
          acc.className += ` ${k}_${v}`
          continue
        }

        Object.assign(acc.style, tokenCfg?.resolve(v, execConfig.tokens, ctx))
      }

      // Process breakpoint overrides into CSS variable fallback chains
      const bpValues = config?.breakpoints?.__breakpoints as
        | Record<string, number>
        | undefined
      if (bpValues && Object.keys(breakpointOverrides).length > 0) {
        // Sort breakpoints by pixel value (ascending) for proper cascade
        const sortedBps = Object.entries(bpValues).sort(([, a], [, b]) => a - b)

        for (const [prop, overrides] of Object.entries(breakpointOverrides)) {
          // Raw `style` inside a breakpoint — the escape-hatch analogue of the
          // pseudo path's __style handling. Each css property named by any
          // override gets its own chain, based on the resting inline value
          // when one exists.
          if (prop === 'style') {
            const allCssProps = new Set<string>()
            for (const { value } of overrides) {
              if (value && typeof value === 'object') {
                for (const cssProp in value as Record<string, unknown>)
                  allCssProps.add(cssProp)
              }
            }
            for (const cssProp of allCssProps) {
              const kebabProp = camelToKebab(cssProp)
              for (const { breakpoint, value } of overrides) {
                const styleVal = value as Record<string, unknown> | null
                if (styleVal?.[cssProp] == null) continue
                const bpName = breakpoint.slice(1)
                acc.style[`--media-${bpName}__${kebabProp}__style`] =
                  `var(--media-${bpName}) ${styleVal[cssProp]}`
              }
              const baseValue =
                acc.style[cssProp] != null ? String(acc.style[cssProp]) : null
              let chain = baseValue
              for (const [bpKey] of sortedBps) {
                if (
                  overrides.some((o) => {
                    const sv = o.value as Record<string, unknown> | null
                    return o.breakpoint === `@${bpKey}` && sv?.[cssProp] != null
                  })
                ) {
                  const varName = `--media-${bpKey}__${kebabProp}__style`
                  chain =
                    chain === null
                      ? `var(${varName})`
                      : `var(${varName}, ${chain})`
                }
              }
              if (chain !== null) acc.style[cssProp] = chain
            }
            continue
          }
          // Resolve the base value only when the author DECLARED one. A
          // media-only prop has no resting half, and resolving `undefined`
          // through a unit turned it into `calc(var(--base) * NaN)` — which
          // computes to 0, so an `'@md'`-only max-width collapsed the layout
          // below the breakpoint. With no base the chain ends OPEN instead
          // (see below).
          const hasBase = tokenStyle[prop] !== undefined
          const resolvedBase = hasBase
            ? resolveForChain(system[prop], tokenStyle[prop], execConfig.tokens, ctx)
            : null
          if (hasBase && !resolvedBase) continue

          const resolvedOverrides = overrides.map((o) => ({
            breakpoint: o.breakpoint,
            resolved: resolveForChain(
              system[prop],
              o.value,
              execConfig.tokens,
              ctx,
            ),
          }))

          // CSS property names come from the base AND the overrides, so a
          // media-only prop still emits its chain.
          const cssProps = new Set<string>()
          if (resolvedBase) for (const p in resolvedBase) cssProps.add(p)
          for (const { resolved } of resolvedOverrides) {
            if (resolved) for (const p in resolved) cssProps.add(p)
          }

          for (const cssProp of cssProps) {
            const kebabProp = camelToKebab(cssProp)

            // Generate --media-bp__css-prop custom properties for each override
            for (const { breakpoint, resolved } of resolvedOverrides) {
              if (!resolved?.[cssProp]) continue
              const bpName = breakpoint.slice(1) // remove @
              const varName = `--media-${bpName}__${kebabProp}`
              acc.style[varName] = `var(--media-${bpName}) ${resolved[cssProp]}`
            }

            // Build fallback chain: highest breakpoint first
            // var(--media-xl__bg, var(--media-lg__bg, var(--media-md__bg, base)))
            // With no resting value the chain ends without a fallback: an
            // unset var() makes the declaration invalid at computed-value
            // time, i.e. unset below the breakpoint — the raw-`style` path
            // above has always worked this way.
            let chain =
              resolvedBase?.[cssProp] != null
                ? String(resolvedBase[cssProp])
                : null
            for (const [bpKey] of sortedBps) {
              const bpAtKey = `@${bpKey}`
              if (
                resolvedOverrides.some(
                  (o) => o.breakpoint === bpAtKey && o.resolved?.[cssProp],
                )
              ) {
                const varName = `--media-${bpKey}__${kebabProp}`
                chain =
                  chain === null
                    ? `var(${varName})`
                    : `var(${varName}, ${chain})`
              }
            }

            if (chain !== null) acc.style[cssProp] = chain
          }
        }
      }

      // Process pseudo-state overrides into CSS variable fallback chains
      // Priority: :active > :focus > :hover (active outermost in chain)
      if (Object.keys(pseudoOverrides).length > 0) {
        // Process token-backed props first and raw `style` last. When a pseudo
        // override sets the same CSS property via both a token and raw `style`,
        // this makes precedence deterministic instead of depending on object key
        // order: the raw style wins (escape hatch) and composes on top of the
        // token's fallback chain. Style-derived custom properties use a distinct
        // `__style` namespace so they never overwrite a token's `--toned_*` var.
        const pseudoEntries = Object.entries(pseudoOverrides)
        const orderedPseudoEntries = [
          ...pseudoEntries.filter(([prop]) => prop !== 'style'),
          ...pseudoEntries.filter(([prop]) => prop === 'style'),
        ]

        for (const [prop, overrides] of orderedPseudoEntries) {
          // Special handling for 'style' prop (raw CSS, not token-resolvable)
          if (prop === 'style') {
            const allCssProps = new Set<string>()
            for (const { value } of overrides) {
              if (value && typeof value === 'object') {
                for (const cssProp in value as Record<string, unknown>)
                  allCssProps.add(cssProp)
              }
            }
            for (const cssProp of allCssProps) {
              const kebabProp = camelToKebab(cssProp)
              for (const { pseudo, value } of overrides) {
                const styleVal = value as Record<string, unknown> | null
                if (styleVal?.[cssProp] == null) continue
                const pseudoName = pseudo.slice(1)
                const varName = `--toned_${pseudoName}__${kebabProp}__style`
                acc.style[varName] =
                  `var(--toned_${pseudoName}) ${styleVal[cssProp]}`
              }
              const baseValue =
                acc.style[cssProp] != null ? String(acc.style[cssProp]) : null
              let chain = baseValue
              for (const pseudo of cascadeOrder) {
                if (
                  overrides.some((o) => {
                    const sv = o.value as Record<string, unknown> | null
                    return o.pseudo === pseudo && sv?.[cssProp] != null
                  })
                ) {
                  const pseudoName = pseudo.slice(1)
                  const varName = `--toned_${pseudoName}__${kebabProp}__style`
                  chain = chain
                    ? `var(${varName}, ${chain})`
                    : `var(${varName})`
                }
              }
              if (chain) {
                acc.style[cssProp] = chain
              }
            }
            continue
          }

          // Resolve base value if it exists
          const baseTokenValue = tokenStyle[prop]
          const resolvedBase =
            baseTokenValue != null
              ? resolveForChain(
                  system[prop],
                  baseTokenValue,
                  execConfig.tokens,
                  ctx,
                )
              : null

          // Get CSS property names from any override's resolution
          const sampleResolved = resolveTokenValue(
            system[prop],
            overrides[0]?.value,
            execConfig.tokens,
            ctx,
          )
          if (!sampleResolved) continue

          for (const cssProp in sampleResolved) {
            const kebabProp = camelToKebab(cssProp)

            // Generate --toned_pseudo__css-prop custom properties for each override
            for (const { pseudo, value } of overrides) {
              const pseudoName = pseudo.slice(1) // remove :
              const resolved = resolveForChain(
                system[prop],
                value,
                execConfig.tokens,
                ctx,
              )
              if (!resolved?.[cssProp]) continue

              const varName = `--toned_${pseudoName}__${kebabProp}`
              acc.style[varName] =
                `var(--toned_${pseudoName}) ${resolved[cssProp]}`
            }

            // Build fallback chain: use existing value (e.g. breakpoint chain) or base
            let innerValue =
              acc.style[cssProp] != null
                ? String(acc.style[cssProp])
                : resolvedBase?.[cssProp] != null
                  ? String(resolvedBase[cssProp])
                  : null

            // The resting value for this CSS property may live on a DIFFERENT
            // token: a resting `shadowStep: 'xs'` under a `ring` state
            // override resolves box-shadow through another key entirely.
            // Without this scan the chain's fallback is empty and the resting
            // paint vanishes the moment any state override touches the
            // property (measured: native-select lost its resting shadow-xs).
            if (innerValue == null) {
              for (const baseKey in tokenStyle) {
                if (baseKey === prop || baseKey === 'style') continue
                const cfg = system[baseKey]
                if (!cfg || typeof cfg !== 'object' || !('resolve' in cfg))
                  continue
                const other = resolveForChain(
                  cfg,
                  tokenStyle[baseKey],
                  execConfig.tokens,
                  ctx,
                )
                if (other?.[cssProp] != null) {
                  innerValue = String(other[cssProp])
                  break
                }
              }
              if (innerValue == null) {
                const rawStyle = tokenStyle['style'] as
                  | Record<string, unknown>
                  | undefined
                if (rawStyle && rawStyle[cssProp] != null)
                  innerValue = String(rawStyle[cssProp])
              }
            }

            let chain = innerValue
            for (const pseudo of cascadeOrder) {
              if (overrides.some((o) => o.pseudo === pseudo)) {
                const pseudoName = pseudo.slice(1)
                const varName = `--toned_${pseudoName}__${kebabProp}`
                chain = chain ? `var(${varName}, ${chain})` : `var(${varName})`
              }
            }

            if (chain) {
              acc.style[cssProp] = chain
            }
          }
        }
      }

      return acc
    },
  }

  return ref
}
