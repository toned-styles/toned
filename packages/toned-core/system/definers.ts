/**
 * System definition functions.
 *
 * @module system/definers
 */

import { createStylesheet } from '../stylesheet/StyleSheet.ts'
import type { DEFAULT_KIND } from '../types/stylesheet.ts'
import { serializeCssValue } from '../utils/css-value.ts'
import { immutableSnapshot } from '../utils/immutable.ts'
import { bp, cq } from './conditions.ts'
import {
  fixedConditions,
  type SystemDefinition,
  type SystemOptions,
} from './definition.ts'

export type { SystemDefinition, SystemOptions } from './definition.ts'

import type { TokenOperation } from '../stylesheet/matcher/normalizeRules.ts'
import type {
  AnimationInput,
  ResolveContext,
  StylesheetInput,
  StylesheetType,
  TokenAlphaConfig,
  TokenConfig,
  TokenStyle,
  TokenSystem,
  Tokens,
  TokenTypeConfig,
} from '../types/index.ts'
import { isAnimationDefinition } from '../types/index.ts'
import {
  alphaVarName,
  alphaWrappable,
  applyAlpha,
  DEFAULT_ALPHA_STEPS,
  splitAlphaValue,
  withAlphaExpr,
} from '../utils/alpha.ts'
import {
  type ConditionAtom,
  type ConditionExpr,
  clauseGuard,
  clauseSlug,
  isSimpleExpr,
  lengthToPx,
  parseConditionKey,
} from '../utils/conditions.ts'
import { camelToKebab } from '../utils/css.ts'
import { mergeStyle } from '../utils/mergeStyle.ts'
import { resolvePlatformKeys } from '../utils/platform.ts'
import { PSEUDO_CASCADE_ORDER } from '../utils/pseudo.ts'
import { SYMBOL_ACCESS, SYMBOL_REF, SYMBOL_STYLE } from '../utils/symbols.ts'
import { warnOnce } from '../utils/warn.ts'
import { getConfig } from './config.ts'
import { namespaceOutput, validateSystemId } from './namespace.ts'
import { normalizeDeclarations, validateDeclarations } from './normalize.ts'
import {
  applyConditionalOrder,
  applyOperationOrder,
} from './operation-order.ts'
import {
  CONDITIONAL_RULES,
  type ConditionalRule,
  compilePredicateGuard,
} from './predicate-css.ts'
import { createQueries } from './queries.ts'

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
  const Values extends readonly unknown[],
  Result extends {},
  const Dynamic extends 'number' | 'string',
  const Extra extends TokenAlphaConfig & TokenTypeConfig = {},
>(
  config: Omit<TokenConfig<Values, Result>, 'resolve' | 'dynamic'> & {
    dynamic: Dynamic
    resolve: (
      value: Values[number] | (Dynamic extends 'number' ? number : string),
      tokens: Tokens,
      context?: ResolveContext,
    ) => Result
  } & Extra,
): TokenConfig<Values, Result> & Extra & { dynamic: Dynamic }
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
): TokenConfig<Values, Result> & Extra
export function defineToken(config: any): any {
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
  const S extends Record<string, TokenConfig<any, any>>,
  const C extends SystemOptions = {},
>(
  definition: SystemDefinition<S, C>,
): TokenSystem<S & C & { readonly [DEFAULT_KIND]: 'view' }, C>
export function defineSystem<
  const S extends Record<string, TokenConfig<any, any>>,
  const C extends SystemOptions = {},
>(system: S, config?: C): TokenSystem<S & C, C>
export function defineSystem<
  const S extends Record<string, TokenConfig<any, any>>,
  const C extends SystemOptions = {},
>(input: S | SystemDefinition<S, C>, legacyConfig?: C): TokenSystem<S & C, C> {
  const descriptor =
    typeof input['id'] === 'string' && 'tokens' in input
      ? (input as SystemDefinition<S, C>)
      : undefined
  const system = descriptor
    ? immutableSnapshot(descriptor.tokens)
    : (input as S)
  const config = descriptor
    ? fixedConditions(descriptor.conditions)
    : immutableSnapshot(legacyConfig)
  const id = descriptor ? validateSystemId(descriptor.id) : undefined
  for (const key of Object.keys(system)) {
    if (
      /^[$@:]/.test(key) ||
      [
        'media',
        'breakpoints',
        'containers',
        'states',
        'base',
        'animations',
        'bridges',
        'responsiveTokens',
      ].includes(key)
    )
      throw new Error(`Toned: reserved token name ${JSON.stringify(key)}`)
  }
  const ref: TokenSystem<S & C, C> = {
    id,
    tokens: Object.freeze({ ...system }) as unknown as TokenSystem<
      S & C,
      C
    >['tokens'],
    themes: descriptor?.themes
      ? immutableSnapshot(descriptor.themes)
      : undefined,
    system: Object.freeze({ ...system, ...config }) as S & C,
    config,
    q: createQueries<C>(),
    usedConditions: new Set<string>(),
    // The generic builders, retyped to this system's declared names.
    cq: cq as TokenSystem<S & C, C>['cq'],
    bp: bp as TokenSystem<S & C, C>['bp'],
    style: (value) => immutableSnapshot(normalizeDeclarations(value)),
    t: (...values) => {
      const value: Record<string, unknown> & { style?: unknown } = {}
      for (const v of values) {
        const src = (SYMBOL_STYLE in v ? v[SYMBOL_STYLE] : v) as Record<
          string,
          unknown
        > & {
          style?: unknown
        }
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
    stylesheet: (<T extends StylesheetInput<S & C, T>>(
      rules: T | ((q: TokenSystem<S & C, C>['q']) => T),
    ) => {
      // biome-ignore lint/suspicious/noExplicitAny: complex type intersection requires cast
      const declaration = normalizeDeclarations(
        typeof rules === 'function' ? rules(ref.q) : rules,
      )
      if (id) validateDeclarations(declaration, config ?? {})
      return createStylesheet(ref as any, declaration)
    }) as StylesheetType<S & C>,
    exec: function execute(execConfig, tokenStyle, unnamespaced = false) {
      tokenStyle = normalizeDeclarations(tokenStyle)
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
      // The sibling channels ('source~:<alias>' → ':sib-<alias>' on a
      // following-sibling target) sit below even the descendant channels.
      const sibStateOrder = stateAliases.map((k) => `:sib-${k}` as const)
      const cascadeOrder = [
        ...sibStateOrder,
        ...srcStateOrder,
        ...PSEUDO_CASCADE_ORDER,
        ...stateOrder,
      ]
      /*
       * COMPOUND keys (':open:hover') — AND semantics in the css chain mode:
       * the value var is guarded by the PRODUCT of the parts' space toggles,
       * so it resolves only when every part is on. Compounds sit OUTSIDE
       * their constituents in the chain (more specific wins), ordered among
       * themselves by part count then declaration order. The toggles already
       * exist per part (generate.ts emits one per state/pseudo), so a
       * compound needs no new generated css. Runtime pseudo mode does not
       * track compounds — they are a css-mode capability.
       */
      const chainVarName = (pseudo: string): string =>
        pseudo.slice(1).replaceAll(':', '--')
      const chainGuard = (pseudo: string): string =>
        pseudo
          .slice(1)
          .split(':')
          .map((part) => `var(--toned_${part})`)
          .join(' ')
      const withCompounds = (
        overrides: Array<{ pseudo: string }>,
      ): readonly string[] => {
        const compounds: string[] = []
        for (const { pseudo } of overrides) {
          if (pseudo.indexOf(':', 1) !== -1 && !compounds.includes(pseudo))
            compounds.push(pseudo)
        }
        if (compounds.length === 0) return cascadeOrder
        compounds.sort((a, b) => a.split(':').length - b.split(':').length)
        return [...cascadeOrder, ...compounds]
      }
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
              pseudoOverrides[prop].push({
                pseudo: k,
                tokenKey: prop,
                value: val,
              })
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
        | Record<string, number | string>
        | undefined
      const cqValues = config?.containers as
        | Record<string, Record<string, number | string>>
        | undefined
      if (
        (bpValues || cqValues) &&
        Object.keys(breakpointOverrides).length > 0
      ) {
        // Parse every distinct condition key once (see utils/conditions.ts for
        // the model: DNF over breakpoint / container-step / ad-hoc min-width
        // atoms). A key that does not parse, or that names an undeclared
        // breakpoint or container, is dropped WITH a warning — a typo must
        // never silently paint nothing.
        const exprByKey = new Map<string, ConditionExpr>()
        const atomDeclared = (a: ConditionAtom): boolean =>
          a.container === null
            ? a.step! in (bpValues ?? {})
            : a.container in (cqValues ?? {}) &&
              (a.step === null || a.step in cqValues![a.container]!)
        for (const overrides of Object.values(breakpointOverrides)) {
          for (const o of overrides) {
            const body = o.breakpoint.slice(1)
            if (exprByKey.has(body)) continue
            const expr = parseConditionKey(body)
            if (!expr || !expr.every((clause) => clause.every(atomDeclared))) {
              warnOnce(
                `condition:${body}`,
                `the condition key '@${body}' names an undeclared breakpoint or ` +
                  'container (or does not parse) — the override is dropped. ' +
                  "Container NAMES must be declared in the system's " +
                  '`containers`; only their condition VALUES are free.',
              )
              continue
            }
            exprByKey.set(body, expr)
          }
        }

        // ORDER: simple positive atoms keep the familiar scale — media
        // ascending (a parenthesised raw condition sorts outermost among
        // them), then containers in declaration order with their widths
        // ascending, declared steps and ad-hoc atoms interleaved by width.
        // A container condition measures the element's own ancestor, so it is
        // more local than any viewport condition and wins outermost.
        // Algebraic expressions (negated, AND-ed or OR-ed) come after ALL
        // simple atoms, in declaration order: they are declared winners over
        // the ladder.
        const containerOrder = Object.keys(cqValues ?? {})
        // Container NUMBERS ride the universal base scale; breakpoint numbers
        // keep their legacy px meaning.
        const basePx = (config as { base?: number })?.base ?? 4
        const atomRank = (a: ConditionAtom): [number, number, number] =>
          a.container === null
            ? [0, 0, lengthToPx(bpValues![a.step!]!)]
            : [
                1,
                containerOrder.indexOf(a.container),
                lengthToPx(
                  a.step !== null ? cqValues![a.container]![a.step]! : a.min!,
                  basePx,
                ),
              ]
        const simpleKeys: string[] = []
        const complexKeys: string[] = []
        for (const [body, expr] of exprByKey) {
          ;(isSimpleExpr(expr) ? simpleKeys : complexKeys).push(body)
        }
        simpleKeys.sort((a, b) => {
          const ra = atomRank(exprByKey.get(a)![0]![0]!)
          const rb = atomRank(exprByKey.get(b)![0]![0]!)
          return ra[0] - rb[0] || ra[1] - rb[1] || ra[2] - rb[2]
        })
        const orderedKeys = [...simpleKeys, ...complexKeys]

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
              // One parameter var per OR-clause (its guard is the product of
              // the clause's toggle vars); the clauses of one condition sit
              // adjacent in the chain sharing the value — OR is free in a
              // fallback chain.
              for (const { breakpoint, value } of overrides) {
                const styleVal = value as Record<string, unknown> | null
                if (styleVal?.[cssProp] == null) continue
                const expr = exprByKey.get(breakpoint.slice(1))
                if (!expr) continue
                for (const clause of expr) {
                  acc.style[`--${clauseSlug(clause)}__${kebabProp}__style`] =
                    `${clauseGuard(clause)} ${serializeCssValue(cssProp, styleVal[cssProp])}`
                }
              }
              const baseValue =
                acc.style[cssProp] != null
                  ? serializeCssValue(cssProp, acc.style[cssProp])
                  : null
              let chain = baseValue
              for (const condKey of orderedKeys) {
                if (
                  !overrides.some((o) => {
                    const sv = o.value as Record<string, unknown> | null
                    return (
                      o.breakpoint === `@${condKey}` && sv?.[cssProp] != null
                    )
                  })
                )
                  continue
                for (const clause of exprByKey.get(condKey)!) {
                  const varName = `--${clauseSlug(clause)}__${kebabProp}__style`
                  chain =
                    chain === null
                      ? `var(${varName}, revert-layer)`
                      : `var(${varName}, ${chain})`
                }
              }
              if (chain !== null) acc.style[cssProp] = chain
            }
            continue
          }
          // Class mode for the opted tokens (`responsiveTokens` on the
          // declaration): every override enumerated → responsive atomic
          // classes from generate()'s media blocks, instead of a chain — the
          // breakpoint value then loses to a caller's utilities, exactly like
          // the resting atomic. All-or-nothing per property: a mixed set
          // (one boxed-primitive escape) keeps the whole chain so the
          // breakpoint ORDER stays inside one mechanism.
          const responsive = (
            config as { responsiveTokens?: readonly string[] }
          )?.responsiveTokens
          if (
            execConfig.useClassName &&
            responsive?.includes(prop) &&
            // Only simple positive BREAKPOINT atoms have responsive atomic
            // classes — container conditions and algebraic expressions always
            // ride the chain.
            overrides.every((o) => {
              const expr = exprByKey.get(o.breakpoint.slice(1))
              return (
                expr !== undefined &&
                isSimpleExpr(expr) &&
                expr[0]![0]!.container === null
              )
            }) &&
            overrides.every((o) =>
              (
                system[prop] as { values?: readonly unknown[] } | undefined
              )?.values?.includes(o.value),
            )
          ) {
            for (const o of overrides) {
              acc.className ??= ''
              acc.className += ` ${o.breakpoint}:${prop}_${o.value}`
            }
            continue
          }

          // Resolve the base value only when the author DECLARED one. A
          // media-only prop has no resting half, and resolving `undefined`
          // through a unit turned it into `calc(var(--base) * NaN)` — which
          // computes to 0, so an `'@md'`-only max-width collapsed the layout
          // below the breakpoint. With no base the chain ends in
          // `revert-layer` instead (see below).
          const hasBase = tokenStyle[prop] !== undefined
          const resolvedBase = hasBase
            ? resolveForChain(
                system[prop],
                tokenStyle[prop],
                execConfig.tokens,
                ctx,
              )
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

            // One parameter var per OR-clause of each override's condition,
            // guarded by the product of the clause's toggle vars (AND is the
            // same product guard compound pseudo keys use; NOT rides the
            // `-not` complement toggle inside the guard).
            for (const { breakpoint, resolved } of resolvedOverrides) {
              if (resolved?.[cssProp] == null) continue
              const expr = exprByKey.get(breakpoint.slice(1))
              if (!expr) continue
              for (const clause of expr) {
                acc.style[`--${clauseSlug(clause)}__${kebabProp}`] =
                  `${clauseGuard(clause)} ${serializeCssValue(cssProp, resolved[cssProp])}`
              }
            }

            // Build fallback chain: highest breakpoint first
            // var(--media-xl__bg, var(--media-lg__bg, var(--media-md__bg, base)))
            // A multi-clause condition contributes adjacent links sharing its
            // value. With no resting value the chain ends in `revert-layer`
            // (css-hooks' trick): when every condition is off, the declaration
            // rolls back past the style attribute to the author layers, so a
            // resting ATOMIC CLASS for the same property still applies — where
            // an open-ended chain computed to unset and stomped it.
            let chain =
              acc.style[cssProp] != null
                ? serializeCssValue(cssProp, acc.style[cssProp])
                : resolvedBase?.[cssProp] != null
                  ? serializeCssValue(cssProp, resolvedBase[cssProp])
                  : null
            for (const condKey of orderedKeys) {
              const condAtKey = `@${condKey}`
              if (
                !resolvedOverrides.some(
                  (o) =>
                    o.breakpoint === condAtKey && o.resolved?.[cssProp] != null,
                )
              )
                continue
              for (const clause of exprByKey.get(condKey)!) {
                const varName = `--${clauseSlug(clause)}__${kebabProp}`
                chain =
                  chain === null
                    ? `var(${varName}, revert-layer)`
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
                const varName = `--toned_${chainVarName(pseudo)}__${kebabProp}__style`
                acc.style[varName] =
                  `${chainGuard(pseudo)} ${serializeCssValue(cssProp, styleVal[cssProp])}`
              }
              const baseValue =
                acc.style[cssProp] != null
                  ? serializeCssValue(cssProp, acc.style[cssProp])
                  : null
              let chain = baseValue
              for (const pseudo of withCompounds(overrides)) {
                if (
                  overrides.some((o) => {
                    const sv = o.value as Record<string, unknown> | null
                    return o.pseudo === pseudo && sv?.[cssProp] != null
                  })
                ) {
                  const varName = `--toned_${chainVarName(pseudo)}__${kebabProp}__style`
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

          // A resolver may emit different fields for different values. Resolve
          // once and collect every field, including zero-valued overrides.
          const resolvedOverrides = overrides.map(({ pseudo, value }) => ({
            pseudo,
            resolved: resolveForChain(
              system[prop],
              value,
              execConfig.tokens,
              ctx,
            ),
          }))
          const cssProps = new Set(Object.keys(resolvedBase ?? {}))
          for (const { resolved } of resolvedOverrides) {
            for (const key of Object.keys(resolved ?? {})) cssProps.add(key)
          }
          for (const cssProp of cssProps) {
            const kebabProp = camelToKebab(cssProp)
            for (const { pseudo, resolved } of resolvedOverrides) {
              if (resolved?.[cssProp] == null) continue
              const varName = `--toned_${chainVarName(pseudo)}__${kebabProp}`
              acc.style[varName] =
                `${chainGuard(pseudo)} ${serializeCssValue(cssProp, resolved[cssProp])}`
            }

            // Build fallback chain: use existing value (e.g. breakpoint chain) or base
            let innerValue =
              acc.style[cssProp] != null
                ? serializeCssValue(cssProp, acc.style[cssProp])
                : resolvedBase?.[cssProp] != null
                  ? serializeCssValue(cssProp, resolvedBase[cssProp])
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
                  innerValue = serializeCssValue(cssProp, other[cssProp])
                  break
                }
              }
              if (innerValue == null) {
                const rawStyle = tokenStyle['style'] as
                  | Record<string, unknown>
                  | undefined
                if (rawStyle && rawStyle[cssProp] != null)
                  innerValue = serializeCssValue(cssProp, rawStyle[cssProp])
              }
            }

            let chain = innerValue
            for (const pseudo of withCompounds(overrides)) {
              if (
                resolvedOverrides.some(
                  (o) => o.pseudo === pseudo && o.resolved?.[cssProp] != null,
                )
              ) {
                const varName = `--toned_${chainVarName(pseudo)}__${kebabProp}`
                chain = chain ? `var(${varName}, ${chain})` : `var(${varName})`
              }
            }

            if (chain) {
              acc.style[cssProp] = chain
            }
          }
        }
      }

      const operations = (tokenStyle as Record<symbol, unknown>)[
        Symbol.for('@toned/operations')
      ] as readonly TokenOperation[] | undefined
      const resolveOrdered = (declaration: Record<string, unknown>) =>
        execute(
          { ...execConfig, useClassName: false },
          declaration as TokenStyle<S & C>,
          true,
        ).style as Record<string, unknown>
      const applyConditional = (
        output: Record<string, unknown>,
        record: ConditionalRule,
      ) => {
        const guard = compilePredicateGuard(
          record.predicate,
          record.part,
          `${record.order}-0`,
          output,
        )
        const resolved = resolveOrdered(record.style)
        for (const [property, value] of Object.entries(resolved)) {
          if (property.startsWith('--')) {
            output[property] = value
            continue
          }
          const key = `--toned-rule-${record.order}-0-${camelToKebab(property)}`
          output[key] = `${guard} ${serializeCssValue(property, value)}`
          output[property] =
            `var(${key}, ${output[property] == null ? 'revert-layer' : serializeCssValue(property, output[property])})`
        }
      }
      if (operations?.some((operation) => operation.conditional)) {
        Object.assign(
          acc.style,
          applyConditionalOrder(operations, resolveOrdered, applyConditional),
        )
      } else {
        if (operations?.length)
          applyOperationOrder(operations, acc.style, !!id, resolveOrdered)
        // Compatibility for directly executed declarations carrying the public
        // conditional-record symbol rather than a matcher occurrence stream.
        const conditional = (tokenStyle as Record<symbol, unknown>)[
          CONDITIONAL_RULES
        ] as ConditionalRule[] | undefined
        for (const record of conditional ?? [])
          applyConditional(acc.style, record)
      }
      return id && !unnamespaced ? namespaceOutput(acc, id) : acc
    },
  }

  return ref
}
