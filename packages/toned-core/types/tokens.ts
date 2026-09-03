/**
 * Token-related type definitions.
 *
 * @module types/tokens
 */

/**
 * Token values object - maps token names to their resolved values.
 * Used by resolve functions to access the design token values.
 *
 * @example
 * ```ts
 * const tokens: Tokens = {
 *   colors: { primary: '#007bff', secondary: '#6c757d' },
 *   spacing: { sm: 4, md: 8, lg: 16 }
 * }
 * ```
 */
// biome-ignore lint/suspicious/noExplicitAny: tokens are dynamically typed based on user configuration
export type Tokens = Record<string, any>

/**
 * Token configuration - defines possible values and how to resolve them to styles.
 *
 * @template Values - Tuple of allowed values (use `as const` for literal types)
 * @template Result - The CSS properties object returned by resolve
 *
 * @example
 * ```ts
 * const bgColor: TokenConfig<['primary', 'secondary'], { backgroundColor: string }> = {
 *   values: ['primary', 'secondary'],
 *   resolve: (value, tokens) => ({ backgroundColor: tokens.colors[value] })
 * }
 * ```
 */
/**
 * Context passed to a token's `resolve` as its third argument, so a token can
 * resolve differently per platform where CSS and native genuinely diverge
 * (`elevation` → box-shadow on web, shadow* props on native; also gradients,
 * backdrop-filter, ::selection). Optional and additive — a two-arg resolver is
 * unaffected. `platform` is whatever `Config.platform` carries at exec time
 * (`'web'` during static CSS generation, `'native'` under the RN binding).
 */
export type ResolveContext = { platform?: import('./config.ts').Platform }

// biome-ignore lint/suspicious/noExplicitAny: const generic requires any[] for tuple inference
export type TokenConfig<Values extends readonly any[], Result> = {
  values: Values
  resolve: (value: Values[number], tokens: Tokens, ctx?: ResolveContext) => Result
  /**
   * CSS properties in `resolve`'s result that carry this token's colour.
   * Declaring it enables the alpha modifier — `bgColor: 'primary/90'` — see
   * `utils/alpha.ts` for the whole mechanism.
   */
  alphaChannel?: readonly string[]
  /** Alpha percentages that get a static atomic class (default: 5…95 by 5).
   * Off-scale values still work via an inline parameter custom property. */
  alphaSteps?: readonly number[]
  /** Element types this token applies to — see `TokenTypeConfig`. */
  $types?: readonly ElementType[]
  /** Inheritable on a View — see `TokenInheritConfig`. */
  inherit?: boolean
}

/** The extra shape `defineToken` preserves so `TokenStyle` can widen values. */
export type TokenAlphaConfig = {
  alphaChannel?: readonly string[]
  alphaSteps?: readonly number[]
}

/** The element types a stylesheet element can declare via `$$type`. */
export type ElementType = 'view' | 'text' | 'image'

/**
 * The extra shape `defineToken` preserves so element `$$type` declarations can
 * constrain a token: a token declaring `$types: ['text']` is OFFERED (and
 * allowed) only on elements whose `$$type` is 'text' — which is how a
 * stylesheet stays React-Native-compliant, where text styling exists only on
 * Text. A token without `$types` is allowed everywhere; an element without
 * `$$type` accepts everything (untyped elements opt out of enforcement).
 */
export type TokenTypeConfig = {
  $types?: readonly ElementType[]
  /**
   * The principled third $types state. A token declaring `$types: ['text']` is
   * normally an ERROR on a view; marked `inherit: true` it becomes LEGAL on a
   * view too — carried there as an inheritable value rather than a direct style.
   * The web/native split falls out of the binding, not the stylesheet: the same
   * declaration is CSS inheritance on web (the token emits its property on the
   * div, which descendants inherit) and a Text context default on native.
   */
  inherit?: boolean
}

/**
 * Breakpoints configuration wrapper.
 * Use `__breakpoints` to define responsive breakpoints.
 *
 * @example
 * ```ts
 * const breakpoints: Breakpoints<{ sm: 640, md: 768, lg: 1024 }> = {
 *   __breakpoints: { sm: 640, md: 768, lg: 1024 }
 * }
 * ```
 */
export type Breakpoints<O extends Record<string, number>> = { __breakpoints: O }

/**
 * Token style declaration - the complete system definition.
 * Maps token names to their configurations, with optional breakpoints.
 */
/**
 * One animation's keyframes: step ('from' | 'to' | '50%') to raw CSS
 * properties. Raw on purpose — keyframes are enumerated, system-compiled
 * artifacts (like the tokens), and a var() reference in a value still resolves
 * against the token custom properties at play time (which is also how a
 * per-instance parameter enters a shared keyframes body:
 * `transform: 'translateX(var(--enter-x, 0))'`).
 */
export type AnimationKeyframes = Record<string, Record<string, string | number>>

/**
 * A full animation: keyframes plus the timing that compiles into the
 * animation's class, so `animation: 'pulse'` is self-contained. Every field
 * maps to its CSS property; a bare keyframes record is accepted wherever this
 * is (name only, timing supplied by the consumer).
 */
export type AnimationDefinition = {
  keyframes: AnimationKeyframes
  /** animation-duration — a number is milliseconds. */
  duration?: number | string
  /** animation-timing-function. */
  easing?: string
  /** animation-delay — a number is milliseconds. */
  delay?: number | string
  /** animation-iteration-count. */
  iterations?: number | 'infinite'
  /** animation-direction. */
  direction?: 'normal' | 'reverse' | 'alternate' | 'alternate-reverse'
  /** animation-fill-mode. */
  fillMode?: 'none' | 'forwards' | 'backwards' | 'both'
}

export type AnimationInput = AnimationKeyframes | AnimationDefinition

/**
 * A bridge: styling for a target CSS alone cannot reach from the element's
 * own style attribute — a pseudo-element (`::placeholder`) or a descendant
 * (` svg`). The system css emits ONE static rule per bridge reading parameter
 * custom properties (`--toned-b-<bridge>-<prop>`), plus a boundary reset on
 * `._` so a parameter never leaks across component boundaries; tokens then
 * just resolve to those parameters. On platforms without CSS the same
 * parameters surface as element PROPS through the binding's `bridgeProps`
 * mapping (placeholderTextColor et al).
 */
export type BridgeConfig = {
  /** Starts with ':' → attaches to the element (`._::placeholder`);
   * otherwise a descendant selector suffix (`._ <selector>`). */
  selector: string
  /** The CSS properties the bridge rule reads, camelCase. */
  properties: readonly string[]
}

/** Narrow an input to its two halves. */
export const isAnimationDefinition = (
  a: AnimationInput,
): a is AnimationDefinition =>
  'keyframes' in a &&
  typeof a.keyframes === 'object' &&
  !Array.isArray(a.keyframes)

export type TokenStyleDeclaration = {
  // biome-ignore lint/suspicious/noExplicitAny: index signature must accept all TokenConfig variants
  [key: string]:
    | TokenConfig<any, any>
    | Breakpoints<any>
    | Record<string, AnimationInput>
    | Record<string, BridgeConfig>
    | Record<string, string>
    | undefined
  // biome-ignore lint/suspicious/noExplicitAny: breakpoints use generic parameter
  breakpoints?: Breakpoints<any>
  /** Named animations compiled with the system css — see `defineAnimations`. */
  animations?: Record<string, AnimationInput>
  /** Bridge declarations compiled with the system css — see `BridgeConfig`. */
  bridges?: Record<string, BridgeConfig>
  /**
   * Static state selectors — the attribute/pseudo analogue of breakpoints.
   * A `states: { open: "[data-state='open']" }` declaration lets a stylesheet
   * write `':open': { bgColor: 'accent' }`, compiled to the same self-scoped
   * custom-property toggle machinery as `:hover` (no runtime). Declared states
   * sit OUTERMOST in the cascade — a `data-state` paint beats `:hover`, which
   * is what a radix component's "on"/"open" state must do. Alias → selector;
   * the selector is applied to the element (`._<selector>`).
   */
  states?: Record<string, string>
}

/** Filter out 'breakpoints' key from token style keys */
export type TokenKeys<S> = Exclude<keyof S, 'breakpoints'>

import type { TonedTypeRegistry } from '../registry.ts'

/**
 * Inline style object — what the `style` escape hatch accepts. Tuned by the
 * host through the `TonedTypeRegistry` (see ../registry.ts): unaugmented it
 * stays permissive, a platform binding's tuning module narrows it.
 */
export type InlineStyle = TonedTypeRegistry extends { inlineStyle: infer T }
  ? T
  : // biome-ignore lint/suspicious/noExplicitAny: the unaugmented default is permissive
    any

/**
 * Style object for a token system - maps token names to their allowed values.
 *
 * @template S - The token style declaration
 *
 * @example
 * ```ts
 * // For a system with bgColor and padding tokens:
 * const style: TokenStyle<typeof system> = {
 *   bgColor: 'primary',
 *   padding: 2,
 *   style: { opacity: 0.5 } // inline styles
 * }
 * ```
 */
/**
 * Does a token apply to an element of type ET? Untyped elements (ET =
 * undefined) accept everything; tokens without `$types` apply everywhere.
 */
type TokenAllowedOn<
  C,
  ET extends ElementType | undefined,
> = ET extends ElementType
  ? Extract<C, { $types: readonly ElementType[] }> extends never
    ? true
    : Extract<C, { $types: readonly ElementType[] }> extends {
          $types: infer TS extends readonly ElementType[]
        }
      ? ET extends TS[number]
        ? true
        : // Outside its $types: allowed only if the token is `inherit` AND this
          // is a view — a view may carry an inheritable value (CSS inheritance
          // on web, a Text context default on native).
          C extends { inherit: true }
          ? ET extends 'view'
            ? true
            : false
          : false
      : true
  : true

export type TokenStyle<
  S extends TokenStyleDeclaration,
  ET extends ElementType | undefined = undefined,
> = TokenStyleAllowed<S, ET> &
  TokenStyleForbidden<S, ET> & { style?: InlineStyle }

type TokenStyleAllowed<
  S extends TokenStyleDeclaration,
  ET extends ElementType | undefined,
> = Partial<{
  // `Extract` first, because on the OPEN system (`S` = TokenStyleDeclaration
  // itself) `S[key]` is the union `TokenConfig | Breakpoints | undefined`, which
  // does not extend `TokenConfig<infer V, unknown>`. Without the Extract that
  // branch yields `never`, so TokenStyle<TokenStyleDeclaration> collapses to
  // `Partial<{ [x: string]: never }>` — every style object becomes a type error,
  // and TokenSystem<Concrete> stops being assignable to TokenSystem<open>.
  // Extracting the TokenConfig member keeps the open system permissive while
  // leaving concrete systems exactly as strict as before.
  //
  // The `as` clause drops tokens whose `$types` excludes this element's
  // declared `$$type` — they are not offered, and using one is an error.
  [key in TokenKeys<S> as TokenAllowedOn<S[key], ET> extends true
    ? key
    : never]: Extract<
    S[key],
    // biome-ignore lint/suspicious/noExplicitAny: matching all TokenConfig variants
    TokenConfig<any, unknown>
  > extends TokenConfig<infer V, unknown>
    ? // A token that declared an alphaChannel also accepts `'value/alpha'`.
      // The presence test is on a REQUIRED alphaChannel, so the open system
      // (where the field is merely optional) stays exactly as strict as before.
      Extract<S[key], { alphaChannel: readonly string[] }> extends never
      ? V[number]
      : V[number] | `${V[number] & string}/${number}`
    : never
}>

/**
 * Tokens whose `$types` exclude this element's `$$type`, mapped to
 * never-valued optionals rather than merely dropped: a dropped key would pass
 * generic-constraint validation (which checks assignability without
 * excess-property freshness), while `paddingX?: never` rejects any value with
 * a readable error.
 */
type TokenStyleForbidden<
  S extends TokenStyleDeclaration,
  ET extends ElementType | undefined,
> = ET extends ElementType
  ? {
      [key in TokenKeys<S> as TokenAllowedOn<S[key], ET> extends false
        ? key
        : never]?: never
    }
  : {}
