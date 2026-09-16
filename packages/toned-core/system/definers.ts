import { createCssExecutor } from '../backends/css/execute.ts'
/**
 * System definition functions.
 *
 * @module system/definers
 */

import { createStylesheet } from '../stylesheet/StyleSheet.ts'
import type { DefaultSystemKind } from '../types/stylesheet.ts'
import { immutableSnapshot } from '../utils/immutable.ts'
import { bp, cq } from './conditions.ts'
import {
  fixedConditions,
  type SystemDefinition,
  type SystemOptions,
} from './definition.ts'

export type { SystemDefinition, SystemOptions } from './definition.ts'

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
import { mergeStyle } from '../utils/mergeStyle.ts'
import { resolvePlatformKeys } from '../utils/platform.ts'
import { SYMBOL_ACCESS, SYMBOL_REF, SYMBOL_STYLE } from '../utils/symbols.ts'
import { getConfig } from './config.ts'
import { validateSystemId } from './namespace.ts'
import { normalizeDeclarations, validateDeclarations } from './normalize.ts'
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
  if (!config.properties) return config
  const fields = new Set<string>(config.properties)
  const resolve = config.resolve
  return {
    ...config,
    properties: Object.freeze([...fields]),
    resolve(value: unknown, tokens: Tokens, context?: ResolveContext) {
      const result = resolve(value, tokens, context)
      for (const field of Object.keys(result ?? {})) {
        if (!fields.has(field))
          throw new Error(
            `Toned: token resolver wrote undeclared field ${field}; update its properties footprint`,
          )
      }
      return result
    },
  }
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

export function defineSystem<
  const S extends Record<string, TokenConfig<any, any>>,
  const C extends SystemOptions = {},
>(definition: SystemDefinition<S, C>): TokenSystem<S & C & DefaultSystemKind, C>
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
    ? (fixedConditions({
        ...descriptor.conditions,
        ...(descriptor.layout ? { layoutContext: descriptor.layout } : {}),
      }) as C)
    : immutableSnapshot(legacyConfig)
  const id = descriptor ? validateSystemId(descriptor.id) : undefined
  for (const key of Object.keys(system)) {
    if (
      /^[$@:]/.test(key) ||
      [
        'layoutContext',
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
    exec: createCssExecutor(system, config, id),
  }

  return ref
}
