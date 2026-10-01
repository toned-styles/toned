/**
 * Stylesheet type definitions.
 *
 * @module types/stylesheet
 */

import type { CssOnlyPseudoState, PseudoState } from '../utils/pseudo.ts'
import type { SYMBOL_INIT, SYMBOL_REF } from '../utils/symbols.ts'

/*
 * Re-exported so a CONSUMER package can emit a declaration for an exported
 * stylesheet. A sheet's type has symbol-keyed members, and tsc will only name
 * those symbols in a `.d.ts` if the emitting file has them in scope, resolved
 * against the module the type is declared in — this one. Without this the
 * export fails with TS4023 and the only escape was annotating the sheet
 * `OverridableStylesheet`, which erases the element, system and variant
 * typing that every override then loses.
 */
export type { SYMBOL_INIT, SYMBOL_REF }

import type { GridArea, GridDefinition } from '../grid/index.ts'
import type { QueryBuilder } from '../system/queries.ts'
import type { QueryKey, ValidQueryKey } from '../system/query-key.ts'
import type { WebRules } from '../web/rules.ts'
import type { EditorOnly } from './editor-mode.ts'
export declare const DEFAULT_KIND: unique symbol
/** Type-only key carrying the target a cross-part shorthand key is checked
 *  against (see ElementStyleNew); never written, never at runtime. */
declare const CROSS_PART: unique symbol
/** Type-only key: the target a written cross-element key is checked against
 *  inside variant rules. */
declare const CROSS_ELEMENT: unique symbol
export type DefaultSystemKind = { readonly [DEFAULT_KIND]: 'view' }

import type { ComposableParts } from './composition.ts'
import type { Config, Platform } from './config.ts'
import type {
  Breakpoints,
  ElementType,
  TokenConfig,
  TokenStyle,
  TokenStyleDeclaration,
} from './tokens.ts'
import type { ValidVariantKey } from './variant-keys.ts'

/** Extract breakpoint keys from a system configuration */
type InferBreakpoints<R> = R extends { media: infer M }
  ? M
  : R extends { breakpoints?: Breakpoints<infer X> }
    ? X
    : {}

/**
 * Declared containers (`containers` config) → their `'<name>/<step>'`
 * condition keys, used exactly like breakpoint keys (`'@card/md': {…}`).
 */
type InferContainerConditions<R> = R extends {
  containers?: infer C extends Record<string, Record<string, unknown>>
}
  ? {
      [N in keyof C & string]: `${N}/${keyof C[N] & string}`
    }[keyof C & string]
  : never

/**
 * The condition-EXPRESSION key shapes: ad-hoc min-widths on DECLARED
 * container names (`'@card/>=100'` — `'@nope/>=100'` is a compile error),
 * negations, and compound (`&`) / disjunctive (`|`) expressions — what the
 * `cq`/`bp`/`not`/`and`/`or` builders serialize to.
 *
 * These also compose inside element rules. ValidateDeclaration checks the
 * actual inferred keys recursively, so a pattern key cannot suppress token
 * typo checks on the surrounding object.
 */
type AdHocAtomKeys<R> = R extends {
  containers?: infer C extends Record<string, Record<string, unknown>>
}
  ? { [N in keyof C & string]: `${N}/>=${string}` }[keyof C & string]
  : never

type ConditionExprKeys<R> =
  | `@>=${number}px`
  | `@${AdHocAtomKeys<R>}`
  // Wide on purpose: `not()` cannot statically name the atom it negates.
  | `@!${string}`
  | `@${string}&${string}`
  | `@${string}|${string}`

/** Declared state aliases (`states` config) → their `:alias` stylesheet keys. */
type InferStatePseudos<R> = R extends { states?: infer States }
  ? States extends Record<string, string>
    ? `:${keyof States & string}`
    : never
  : never

type InferStateChannels<S> = InferStatePseudos<S> extends infer P extends string
  ? P extends `:${infer Name}`
    ? `:src-${Name}` | `:sib-${Name}`
    : never
  : never

/** String, number, or symbol (for object keys) */
type StringOrNumber = string | number | symbol

/** Variant modifier values - used for conditional styling */
export type ModType = Record<string, string | boolean | number>

/** Supported pseudo-class selectors */
/*
 * Derived from the runtime lists rather than restated, because restating it
 * drifted: the tracked set was spelled here by hand and the five CSS-ONLY
 * states (`:focus-visible`, `:focus-within`, and the cross-element channels)
 * were never added, so a stylesheet writing `':focus-visible'` was accepted
 * only because StylesheetInput is used as a CONSTRAINT, which does no excess
 * property checking. `overrideStyles`, which checks its rules for real, then
 * rejected the very thing every button sheet writes.
 */
export type Pseudo = PseudoState | CssOnlyPseudoState

/** Extract string keys from a type */
export type PickString<K> = K extends string ? K : never

/** Brand symbol for internal type discrimination */
export declare const _internalBrand: unique symbol

/** A skipped `t()` argument, as produced by `cond && { ... }` */
type Falsy = false | null | undefined

/** Later keys replace earlier ones, as `Object.assign` does at runtime */
type Override<L, R> = Omit<L, keyof R> & R

/**
 * Fold `t()` arguments left to right. Intersecting them instead would reduce
 * `t({ bgColor: 'a' }, { bgColor: 'b' })` to `never`. An argument that may be
 * falsy only may apply, so it widens the result instead of replacing it.
 */
// biome-ignore lint/suspicious/noExplicitAny: tuple manipulation requires any[]
type Merge<D extends any[], Acc = object> = D extends [
  infer First,
  ...infer Rest,
]
  ? Merge<
      Rest,
      [Exclude<First, Falsy>] extends [never]
        ? Acc
        : [Extract<First, Falsy>] extends [never]
          ? Override<Acc, First>
          : Acc | Override<Acc, Exclude<First, Falsy>>
    >
  : Acc

/**
 * A token style plus the nested `':pseudo'` and `'@breakpoint'` blocks that both
 * `t()` and `stylesheet()` accept.
 *
 * Breakpoint keys are derived from the system's `breakpoints` config, so a
 * system declaring `{ sm, md, lg }` offers exactly `'@sm' | '@md' | '@lg'`.
 * Uses the same checked element vocabulary as stylesheets, including named
 * conditions and platform branches. Cross-part ownership still requires a sheet.
 *
 * @example
 * ```ts
 * const style: TokenStyleWithSelectors<System> = {
 *   bgColor: 'primary',
 *   ':hover': { bgColor: 'secondary' },
 *   '@sm': { padding: 4, style: { gridTemplateColumns: '1fr 1fr' } }
 * }
 * ```
 */
export type TokenStyleWithSelectors<
  S extends TokenStyleDeclaration,
  AvailablePseudo extends string = Pseudo | InferStatePseudos<S>,
  AvailableBreakpoints extends StringOrNumber =
    | keyof InferBreakpoints<S>
    | InferContainerConditions<S>,
> = ElementStyleNew<S, AvailablePseudo, AvailableBreakpoints>

/**
 * The `t()` function type - creates styled objects from token values.
 *
 * @template S - The token style declaration
 *
 * @example
 * ```ts
 * const { t } = defineSystem({ bgColor, padding })
 * const style = t({ bgColor: 'primary', padding: 2 })
 * ```
 */
export type TFun<S extends TokenStyleDeclaration> = <
  D extends (TokenStyleWithSelectors<S> | Falsy)[],
>(
  ...values: [...D]
) => Merge<D> & ResolvedTokenStyle<S>

/** Public name for inferred shorthand/part bags during declaration emission. */
export interface ResolvedTokenStyle<S extends TokenStyleDeclaration> {
  /** @internal */
  [SYMBOL_REF]: TokenSystem<S>
  /** Resolved inline styles */
  readonly style: Record<string, any>
  /** Generated class name string */
  readonly className: string | undefined
}

/**
 * Element style definition with support for pseudo-classes and breakpoints.
 *
 * @example
 * ```ts
 * const element: ElementStyleNew<System> = {
 *   bgColor: 'primary',
 *   ':hover': { bgColor: 'secondary' },
 *   '@sm': { padding: 4 }
 * }
 * ```
 */
export type ElementStyleNew<
  S extends TokenStyleDeclaration,
  AvailablePseudo extends string = Pseudo | InferStatePseudos<S>,
  AvailableBreakpoints extends StringOrNumber =
    | keyof InferBreakpoints<S>
    | InferContainerConditions<S>,
  ET extends ElementType | undefined = undefined,
  Host extends Platform | undefined = undefined,
  Parts extends string = never,
  Static extends boolean = true,
> = TokenStyle<S, ET, Host> & {
  /** Declares a measured container using this system's finite name set. */
  container?: 'container' extends keyof S
    ? S['container'] extends TokenConfig<infer Values, unknown>
      ? Values[number]
      : never
    : S extends { containers: infer C }
      ? keyof C & string
      : never
  $kind?: Static extends true ? ET : never
  /** @deprecated Use $kind. */
  $$type?: Static extends true ? ET : never
} & {
  [P in
    | AvailablePseudo
    | InferStateChannels<S>
    | `:${string}:${string}`]?: ElementStyleNew<
    S,
    AvailablePseudo,
    AvailableBreakpoints,
    ET,
    Host,
    Parts,
    false
  >
} & {
  [B in AvailableBreakpoints as
    | `@${B & string}`
    | `@media ${B & string}`]?: ElementStyleNew<
    S,
    AvailablePseudo,
    AvailableBreakpoints,
    ET,
    Host,
    Parts,
    false
  >
} & {
  [K in
    | InferContainerAliases<S>
    | ConditionExprKeys<S>
    | QueryKey]?: ElementStyleNew<
    S,
    AvailablePseudo,
    AvailableBreakpoints,
    ET,
    Host,
    Parts,
    false
  >
} & {
  [P in Platform as `@platform.${P}` | `@platform ${P}`]?: Host extends Platform
    ? P extends Host
      ? ElementStyleNew<
          S,
          AvailablePseudo,
          AvailableBreakpoints,
          ET,
          P,
          Parts,
          false
        >
      : never
    : ElementStyleNew<
        S,
        AvailablePseudo,
        AvailableBreakpoints,
        ET,
        P,
        Parts,
        false
      >
} & {
  /*
   * A cross-part shorthand (`'Item:hover'`) selects one source. Use q.all/any
   * keys for multiple sources; recursive shorthand expansion makes generic
   * schema unions explode.
   *
   * The keys are NOT enumerated here. `[K in `${Parts}${AvailablePseudo}`]`
   * gave every part one optional member per sibling part per pseudo, at every
   * nesting level — a sheet cost parts² × pseudos (160 parts: 4.95s of check
   * time against 0.64s without it). The target a cross-part key is checked
   * against rides this one type-only member instead, and ValidateDeclaration
   * checks the keys actually WRITTEN against it.
   */
  [CROSS_PART]?: ElementStyleNew<
    S,
    AvailablePseudo,
    AvailableBreakpoints,
    ET,
    Host,
    never,
    false
  >
} & (Host extends 'web'
    ? { $grid?: GridDefinition; $area?: GridArea; $webRules?: WebRules }
    : {})

type InferContainerAliases<S> = S extends {
  containers?: infer C extends Record<string, Record<string, unknown>>
}
  ? {
      [N in keyof C & string]: `@container ${N} ${keyof C[N] & string}`
    }[keyof C & string]
  : never

/** The `$$type` an element declared in the input, if any. */
export type InferElementType<
  T,
  K,
  Default extends ElementType | undefined = undefined,
> = K extends keyof T
  ? T[K] extends { $kind: infer TT extends ElementType }
    ? TT
    : T[K] extends { $$type: infer TT extends ElementType }
      ? TT
      : T[K] extends { $style: unknown }
        ? 'view'
        : Default
  : undefined

/** Extract element names from stylesheet input (excluding selectors) */
export type ExtractElements<T> = {
  [K in keyof T]: K extends
    | `${string}:${string}`
    | `[${string}]`
    | `@${string}`
    | 'prototype'
    ? never
    : K
}[keyof T]

/**
 * Map of element names to their styles.
 * Used in cross-element selectors and variants.
 */
export type ElementMap<
  S extends TokenStyleDeclaration,
  Elements extends string,
  Kinds extends Partial<Record<Elements, ElementType | undefined>> = {},
> = {
  [E in Elements]?: ElementStyleNew<
    S,
    Pseudo | InferStatePseudos<S>,
    keyof InferBreakpoints<S> | InferContainerConditions<S>,
    E extends keyof Kinds ? Kinds[E] : undefined,
    undefined,
    // Never the part names: the shape does not use them (cross-part keys are
    // checked by ValidateDeclaration), and passing them made each sheet's
    // element shape a distinct type whose keys were resolved again per sheet.
    never,
    false
  >
}

type DeclarationKinds<S, T, Elements extends string, Kinds> = {
  [E in Elements]: E extends keyof Kinds
    ? Kinds[E]
    : InferElementType<
        T,
        E,
        S extends { [DEFAULT_KIND]: 'view' } ? 'view' : undefined
      >
}

/**
 * Cross-element selectors (e.g. `'container:hover'`, `'trigger:open'`).
 *
 * Interaction pseudos and their combos, PLUS a single declared-state suffix
 * (`'trigger:open'`) — a parent's data-state styling a descendant. A single
 * state only: compound `state:hover` cross keys stay out of the CSS channel.
 */
/** What may follow a part name in a cross-element key (`'Item:hover'`,
 *  `'Root~:open'`). */
type CrossSuffix<S extends TokenStyleDeclaration> =
  | ':active'
  | ':active:focus'
  | ':active:focus:hover'
  | ':active:hover'
  | ':focus'
  | ':focus:hover'
  | ':hover'
  | Pseudo
  | InferStatePseudos<S>
  | `~${Pseudo | InferStatePseudos<S>}`

/**
 * Whether a WRITTEN key is a cross-element key, matched with `infer` so the
 * `${Elements}${CrossSuffix}` union is never built. Enumerating it as mapped
 * keys (root, variant conditions, and each part) made a sheet cost
 * parts x suffixes, instantiated again for every sheet.
 */
type IsCrossElementKey<
  K,
  Elements extends string,
  S extends TokenStyleDeclaration,
> = K extends `${infer _Part extends Elements}:${infer Rest}`
  ? `:${Rest}` extends CrossSuffix<S>
    ? true
    : false
  : K extends `${infer _Part extends Elements}~${infer Rest}`
    ? `~${Rest}` extends CrossSuffix<S>
      ? true
      : false
    : false

/**
 * One element's rules, exactly as `StylesheetInput` accepts them.
 *
 * The single source for "what may be written about an element": the authoring
 * surface below and `overrideStyles`' rules type both use THIS, so the two
 * cannot drift. Re-deriving the pseudo and breakpoint arguments at a second
 * site is what let overrides reject `:focus-visible` and `@field-group/md`
 * while the stylesheet accepted them.
 */
export type AuthoredElementStyle<
  S extends TokenStyleDeclaration,
  ET extends ElementType | undefined = undefined,
  // Kept for callers; the shape no longer depends on it. Cross-part keys are
  // checked by ValidateDeclaration, which receives the parts itself, so the
  // element shape is instantiated ONCE per system and element kind and shared
  // by every sheet, instead of once per sheet's part-name union.
  _Parts extends string = never,
  Host extends Platform | undefined = undefined,
> = ElementStyleNew<
  S,
  Pseudo | InferStatePseudos<S>,
  keyof InferBreakpoints<S> | InferContainerConditions<S>,
  ET,
  Host,
  never
>

/**
 * `keyof Shape`, computed ONCE per shape. A bare `keyof` inside a conditional
 * is recomputed on every instantiation — for an element shape that is every
 * token and every key pattern, resolved again for each key written at each
 * nesting level (~300k instantiations on a 160-part sheet). A conditional
 * type's instantiations are cached by their arguments, so wrapping it makes
 * the key set a lookup.
 */
type ShapeKeys<T> = [T] extends [unknown] ? keyof T : never

/** Validate inferred object keys recursively, including computed atom keys. */
type ValidCompound<
  Key extends string,
  States extends string,
> = Key extends `:${infer First}:${infer Rest}`
  ? `:${First}` extends States
    ? ValidCompound<`:${Rest}`, States>
    : false
  : Key extends States
    ? true
    : false
export type ValidateDeclaration<
  Input,
  Shape,
  S extends TokenStyleDeclaration,
  Parts extends string = never,
  Local extends boolean = false,
  /*
   * `true` only for a stylesheet's own parts, where the authored shape is
   * intersected alongside and already checks every plain leaf. There a plain
   * leaf answers `unknown` instead of being validated a second time — that
   * re-check was ~75% of a part's type cost. Special subtrees (computed query
   * keys, compound pseudos, cross-part and cross-element keys) switch it back
   * off: their leaves are the only contextual type those keys get (see ValidLeaf).
   */
  Light extends boolean = false,
> = {
  [K in keyof Input]: K extends ShapeKeys<Shape>
    ? K extends QueryKey | `:${string}:${string}`
      ? // In the shape (as a pattern), so a Light walk stays Light below it.
        ValidateSpecial<Input, Shape, S, Parts, Local, K, Light>
      : [
            K extends '$style' | `$named$_${string}`
              ? false
              : K extends `$${string}`
                ? true
                : false,
          ] extends [true]
        ? // A `$` member is a VALUE (`$webRules: webRules(…)`, a `$grid`
          // definition, `$compose`), never nested rules — only `$style` (and
          // a variant's named fragments, which are rules) are walked.
          // Descending into a constructed value re-walked its whole type
          // (csstype's ~800 properties for every `$webRules`) per sheet.
          Light extends true
          ? unknown
          : ValidLeaf<Input[K], Shape[K]>
        : Light extends true
          ? Input[K] extends object
            ? Input[K] extends readonly unknown[]
              ? unknown
              : NonNullable<Shape[K]> extends object
                ? ValidateDeclaration<
                    Input[K],
                    NonNullable<Shape[K]>,
                    S,
                    Parts,
                    K extends Parts ? true : Local,
                    Light
                  >
                : unknown
            : unknown
          : Input[K] extends readonly unknown[]
            ? ValidLeaf<Input[K], Shape[K]>
            : Input[K] extends object
              ? NonNullable<Shape[K]> extends object
                ? ValidateDeclaration<
                    Input[K],
                    NonNullable<Shape[K]>,
                    S,
                    Parts,
                    K extends Parts ? true : Local,
                    Light
                  >
                : ValidLeaf<Input[K], Shape[K]>
              : ValidLeaf<Input[K], Shape[K]>
    : ValidateSpecial<Input, Shape, S, Parts, Local, K>
}

/** The keys a plain shape lookup cannot validate: computed query keys,
 *  compound pseudos, and cross-part / cross-element keys. */
type ValidateSpecial<
  Input,
  Shape,
  S extends TokenStyleDeclaration,
  Parts extends string,
  Local extends boolean,
  K extends keyof Input,
  /*
   * Only for the keys the shape itself carries as patterns (query keys and
   * compound pseudos): there the authored shape checks the leaves, exactly as
   * for plain keys. Cross-part and cross-element keys are not in the shape, so
   * their leaves are always checked here.
   */
  Light extends boolean = false,
> = K extends QueryKey
  ? ValidQueryKey<K, S, Parts, Local> extends true
    ? K extends ShapeKeys<Shape>
      ? ValidateDeclaration<
          Input[K],
          NonNullable<Shape[K]>,
          S,
          Parts,
          K extends Parts ? true : Local,
          Light
        >
      : never
    : never
  : [
        typeof CROSS_ELEMENT extends ShapeKeys<Shape> ? true : false,
        IsCrossElementKey<K, Parts, S>,
      ] extends [true, true]
    ? ValidateDeclaration<
        Input[K],
        NonNullable<Shape[typeof CROSS_ELEMENT & ShapeKeys<Shape>]>,
        S,
        Parts,
        Local
      >
    : // Peeled with `infer`, never as `${Parts}${Pseudo}`: building that union
      // per written key made each sheet cost parts × pseudos again.
      K extends `${infer _Part extends Parts}:${infer Rest}`
      ? `:${Rest}` extends Pseudo | InferStatePseudos<S>
        ? K extends ShapeKeys<Shape>
          ? ValidateDeclaration<
              Input[K],
              NonNullable<Shape[K]>,
              S,
              Parts,
              K extends Parts ? true : Local
            >
          : typeof CROSS_PART extends ShapeKeys<Shape>
            ? ValidateDeclaration<
                Input[K],
                NonNullable<Shape[typeof CROSS_PART]>,
                S,
                never,
                Local
              >
            : never
        : never
      : K extends `:${string}:${string}`
        ? ValidCompound<
            K,
            Pseudo | InferStatePseudos<S> | InferStateChannels<S>
          > extends true
          ? K extends ShapeKeys<Shape>
            ? ValidateDeclaration<
                Input[K],
                NonNullable<Shape[K]>,
                S,
                Parts,
                K extends Parts ? true : Local,
                Light
              >
            : never
          : never
        : never

/**
 * A LEAF of a validated declaration: what a written value is checked, and
 * contextually typed, against.
 *
 * A single written value (the normal case: one literal) gets the whole allowed
 * type, exactly as before. That is load-bearing twice over: it is what the
 * error names, and this object is also a CONTEXTUAL type whose concrete keys
 * (a computed `q.all(…)` key, say) hide the index signatures the authored shape
 * matches the same key with — so this leaf is the only thing offering
 * `$compose` completions or keeping a nested `'sticky'` from widening to
 * `string` (`toned-editor` fixture, `query-keys.test-d.ts`).
 *
 * A `never` or UNION value that fits gets `unknown` instead, and that is the
 * fix for TS2590. Every caller intersects its input with this validation
 * (`Rules & ValidateDeclaration<Rules, …>`). A generic call written INSIDE the
 * rules (a `web({ … })` helper) is contextually typed before `Rules` is
 * inferred, so the leaves it sees are not what was written but `never` or the
 * rules constraint's own value union — and returning the allowed union there
 * made each leaf `Values & (Values | null)`: two union objects, which the
 * checker crosses member by member before reducing, with
 * `` `a/${number}` & `b/${number}` `` never reducing. A colour token with
 * `alphaChannel` has 2N members, so a leaf cost (2N)² and crossed the
 * 100,000-member limit at ~160 colours. `unknown` drops out of the
 * intersection: the cost is linear in the palette
 * (`toned-react/override-scale.test-d.ts` pins 1,000 colours), and a union
 * that does NOT fit still fails against the allowed type.
 */
type ValidLeaf<Value, Allowed> = [Value] extends [never]
  ? unknown
  : true extends IsUnion<Value>
    ? [Value] extends [Allowed]
      ? unknown
      : Allowed
    : Allowed

/** `true` when T has more than one member (distributes, so `never` → `never`). */
type IsUnion<T, U = T> = T extends unknown
  ? [U] extends [T]
    ? false
    : true
  : never

/**
 * Stylesheet input type - defines elements and cross-element selectors.
 */
export type StylesheetInput<
  S extends TokenStyleDeclaration,
  T,
  Elements extends string = PickString<ExtractElements<T>>,
  Kinds extends Partial<Record<string, ElementType | undefined>> = {},
> = {
  [K in Elements]?: AuthoredElementStyle<
    S,
    K extends keyof Kinds
      ? Kinds[K]
      : InferElementType<
          T,
          K,
          S extends { [DEFAULT_KIND]: 'view' } ? 'view' : undefined
        >
  >
} & {
  // Pre-filtered by shape: the `infer … extends Elements` match is the costly
  // part, and a plain part name can never be a cross-element key.
  [K in keyof T as K extends `${string}:${string}` | `${string}~${string}`
    ? IsCrossElementKey<K, Elements, S> extends true
      ? K
      : never
    : never]?: ElementMap<S, Elements, DeclarationKinds<S, T, Elements, Kinds>>
} & {
  /** Target of a written cross-element key when the rules type is generic
   *  (override rules): ValidateDeclaration resolves it by key shape. */
  [CROSS_ELEMENT]?: ElementMap<
    S,
    Elements,
    DeclarationKinds<S, T, Elements, Kinds>
  >
} & {
  [B in (keyof InferBreakpoints<S> & string) | InferContainerConditions<S> as
    | `@${B}`
    | `@media ${B}`]?: ElementMap<
    S,
    Elements,
    DeclarationKinds<S, T, Elements, Kinds>
  >
} & {
  /**
   * Condition-EXPRESSION blocks — see ConditionExprKeys for why these are
   * root-level only: `[not(cq('card').min(100))]: { Root: { … } }`. The
   * `'@container <name> <step>'` alias normalizes to `'@<name>/<step>'` at
   * every level, so the root accepts it as well.
   */
  [K in ConditionExprKeys<S> | InferContainerAliases<S>]?: ElementMap<
    S,
    Elements,
    DeclarationKinds<S, T, Elements, Kinds>
  >
} & {
  [K in QueryKey]?: ElementMap<
    S,
    Elements,
    DeclarationKinds<S, T, Elements, Kinds>
  >
} & {
  [K in keyof T as K extends QueryKey ? K : never]?: K extends QueryKey
    ? ValidQueryKey<K, S, Elements> extends true
      ? ValidateDeclaration<
          T[K],
          ElementMap<S, Elements, DeclarationKinds<S, T, Elements, Kinds>>,
          S,
          Elements
        >
      : never
    : never
} & {
  /** Root-level platform blocks: whole per-element maps, filtered like `@md`. */
  [P in Platform as `@platform.${P}` | `@platform ${P}`]?: {
    [E in Elements]?: ElementStyleNew<
      S,
      Pseudo | InferStatePseudos<S>,
      keyof InferBreakpoints<S> | InferContainerConditions<S>,
      E extends keyof Kinds
        ? Kinds[E]
        : InferElementType<
            T,
            E,
            S extends { [DEFAULT_KIND]: 'view' } ? 'view' : undefined
          >,
      P,
      never,
      false
    >
  }
}

/**
 * The key validation of a stylesheet's own parts, kept OUT of
 * `StylesheetInput` and applied to the argument instead
 * (`style: T & StylesheetValidation<S, T>`).
 *
 * Inside the constraint, every part's type was `authored shape & validation`:
 * a fresh intersection per part, which the checker reduces by materializing
 * all ~300 merged properties of the element shape — for every part of every
 * sheet (~1.5ms of check time for a two-part sheet). On the argument, a part
 * is intersected with its own written literal instead, whose properties are
 * only the keys written, while the constraint relates each part to the one
 * shared authored shape.
 */
export type StylesheetValidation<
  S extends TokenStyleDeclaration,
  T,
  Elements extends string = PickString<ExtractElements<T>>,
  Kinds extends Partial<Record<string, ElementType | undefined>> = {},
> = {
  // One pass over the keys WRITTEN: a part is walked against its authored
  // shape, a root key that addresses parts against what the root accepts.
  [K in keyof T]: string extends K
    ? // A string-keyed record (not a literal) has no names to validate.
      unknown
    : K extends Elements
      ? QueryKey extends keyof NonNullable<T[K]>
        ? // The constraint itself, which is what `T` becomes when inference
          // fails a leaf: its pattern keys would read as invalid query keys
          // and bury the real error at the wrong line.
          unknown
        : ValidateDeclaration<
            T[K],
            AuthoredElementStyle<
              S,
              K extends keyof Kinds
                ? Kinds[K]
                : InferElementType<
                    T,
                    K,
                    S extends { [DEFAULT_KIND]: 'view' } ? 'view' : undefined
                  >
            >,
            S,
            Elements,
            true,
            true
          >
      : RootKeyValidation<S, T, K, Elements, Kinds>
}

/**
 * The ROOT keys that address parts: condition blocks (`'@md'`, `'@media md'`,
 * `'@container …'`, condition expressions, `'@platform web'`) and
 * cross-element keys (`'Root:hover'`, `'Root~:open'`). The constraint only
 * relates their values, and a relation does not reject unknown keys, so a
 * typo'd token inside `'@md': { Root: { … } }` and a cross key naming a part
 * the sheet does not have were both silently accepted. A cross key that is
 * not `<part><state>` is rejected outright; a condition block's parts are
 * walked like the parts themselves (Light: the constraint still checks the
 * values). A `'@…'` key the root shape does not declare stays open (see
 * type-constraints.test-d.ts); query keys have their own member in
 * StylesheetInput.
 */
type RootKeyValidation<
  S extends TokenStyleDeclaration,
  T,
  K extends keyof T,
  Elements extends string,
  Kinds extends Partial<Record<string, ElementType | undefined>>,
> = K extends QueryKey
  ? unknown
  : QueryKey extends keyof T
    ? unknown // the constraint itself (inference failed): nothing to walk
    : K extends `@${string}`
      ? K extends ShapeKeys<StylesheetInput<S, T, Elements, Kinds>>
        ? ValidateDeclaration<
            T[K],
            NonNullable<StylesheetInput<S, T, Elements, Kinds>[K]>,
            S,
            Elements,
            false,
            true
          >
        : unknown
      : K extends `${string}:${string}` | `${string}~${string}`
        ? IsCrossElementKey<K, Elements, S> extends true
          ? ValidateDeclaration<
              T[K],
              ElementMap<S, Elements, DeclarationKinds<S, T, Elements, Kinds>>,
              S,
              Elements,
              false,
              true
            >
          : never
        : unknown

// =============================================================================
// Variant Selector Types
// =============================================================================

import type {
  ExtractNamedStyles,
  NamedStyleKey,
  VariantKey,
  VariantSelector,
} from '../stylesheet/variantSelector.ts'

export type { VariantSelector, VariantKey, NamedStyleKey, ExtractNamedStyles }

/** Annotate the variant callback parameter to infer both its schema and rules. */
export type Variants<
  Mods extends { [K in keyof Mods]: string | number | boolean },
> = VariantSelector<{ [K in keyof Mods]: Mods[K] }>

/**
 * A single selector segment for a key-value pair.
 * For booleans: generates [key], [key=true], [key=false]
 * For strings/numbers: generates [key=value]
 */
type SingleSelector<K extends string, V> = V extends boolean
  ? `[${K}]` | `[${K}=true]` | `[${K}=false]`
  : V extends string | number
    ? `[${K}=${V}]`
    : never

/**
 * Union of all valid single selectors for a Mods type.
 */
type AllSingleSelectors<Mods extends ModType> = {
  [K in keyof Mods]: K extends string
    ? SingleSelector<K, Exclude<Mods[K], undefined>>
    : never
}[keyof Mods]

/**
 * All valid 2-segment selectors (all permutations).
 */
type TwoSegmentSelector<Mods extends ModType> = {
  [K1 in keyof Mods]: K1 extends string
    ? {
        [K2 in Exclude<keyof Mods, K1>]: K2 extends string
          ? `${SingleSelector<K1, Exclude<Mods[K1], undefined>>}${SingleSelector<K2, Exclude<Mods[K2], undefined>>}`
          : never
      }[Exclude<keyof Mods, K1>]
    : never
}[keyof Mods]

/**
 * All valid 3-segment selectors (all permutations).
 */
type ThreeSegmentSelector<Mods extends ModType> = {
  [K1 in keyof Mods]: K1 extends string
    ? {
        [K2 in Exclude<keyof Mods, K1>]: K2 extends string
          ? {
              [K3 in Exclude<keyof Mods, K1 | K2>]: K3 extends string
                ? `${SingleSelector<K1, Exclude<Mods[K1], undefined>>}${SingleSelector<K2, Exclude<Mods[K2], undefined>>}${SingleSelector<K3, Exclude<Mods[K3], undefined>>}`
                : never
            }[Exclude<keyof Mods, K1 | K2>]
          : never
      }[Exclude<keyof Mods, K1>]
    : never
}[keyof Mods]

/**
 * Union of all valid variant selectors (1, 2, or 3 segments).
 */
type AllVariantSelectors<Mods extends ModType> =
  | AllSingleSelectors<Mods>
  | TwoSegmentSelector<Mods>
  | ThreeSegmentSelector<Mods>

/**
 * Legacy variants input - maps variant selectors to element styles.
 * @deprecated Use callback-based variants API instead
 */
export type VariantsInput<
  S extends TokenStyleDeclaration,
  Elements extends string,
  Mods extends ModType,
> = {
  [K in AllVariantSelectors<Mods>]?: ElementMap<S, Elements>
}

// =============================================================================
// New Callback-based Variants API
// =============================================================================

/**
 * Style definition for an element within a variant, with compose support
 */
export type VariantElementStyle<
  S extends TokenStyleDeclaration,
  Elements extends string,
  Kind extends ElementType | undefined = undefined,
  // Kept for callers; the shape no longer depends on it (see
  // AuthoredElementStyle), so every sheet shares one part shape per kind.
  _AllParts extends string = Elements,
  Host extends Platform | undefined = undefined,
> = AuthoredElementStyle<S, Kind, never, Host> & {
  $kind?: never
  $$type?: never
  /** Compose styles from other elements */
  $compose?: Elements | readonly Elements[]
}

/** Compatibility type name for a reusable variant-rule fragment. */
export type NamedStyleDef<
  S extends TokenStyleDeclaration,
  Elements extends string,
  Kinds extends Record<Elements, ElementType | undefined> = Record<
    Elements,
    undefined
  >,
> = VariantStyleDef<S, Elements, string, Kinds>

/**
 * Variant style definition - can compose named styles and define element styles
 */
export type VariantConditions<
  S extends TokenStyleDeclaration,
  // Cross-element keys are matched by IsCrossElementKey, not listed here.
  _Elements extends string,
> =
  | `@${keyof InferBreakpoints<S> & string}`
  | `@media ${keyof InferBreakpoints<S> & string}`
  | `@${InferContainerConditions<S>}`
  | InferContainerAliases<S>
  | ConditionExprKeys<S>
  | QueryKey

export type VariantStyleDef<
  S extends TokenStyleDeclaration,
  Elements extends string,
  Named extends string,
  Kinds extends Record<Elements, ElementType | undefined> = Record<
    Elements,
    undefined
  >,
  Host extends Platform | undefined = undefined,
> = {
  /** Compose styles from named style definitions */
  $compose?: Named | readonly Named[]
} & {
  [E in Elements]?: VariantElementStyle<
    S,
    ComposableParts<Kinds, E>,
    Kinds[E],
    Elements,
    Host
  >
} & {
  [K in VariantConditions<S, Elements>]?: VariantStyleDef<
    S,
    Elements,
    Named,
    Kinds,
    Host
  >
} & {
  /** Target of a written cross-element key (see IsCrossElementKey). */
  [CROSS_ELEMENT]?: VariantStyleDef<S, Elements, Named, Kinds, Host>
} & {
  [P in Platform as `@platform.${P}` | `@platform ${P}`]?: Host extends Platform
    ? P extends Host
      ? VariantStyleDef<S, Elements, Named, Kinds, P>
      : never
    : VariantStyleDef<S, Elements, Named, Kinds, P>
}

/**
 * Infer the result type of a variants callback
 */
export type VariantsCallbackResult<
  S extends TokenStyleDeclaration,
  Elements extends string,
  R,
> = {
  [K in keyof R]: VariantStyleDef<S, Elements, ExtractNamedStyles<R>>
}

/** Editor vocabulary omits forbidden optional-never fields; validation keeps
 * the original shape so aliases and nonliteral objects remain checked. */
type VariantEditorShape<T> = T extends readonly unknown[]
  ? T
  : T extends object
    ? {
        [K in keyof T as [NonNullable<T[K]>] extends [never]
          ? never
          : K]: K extends QueryKey ? T[K] : VariantEditorShape<T[K]>
      }
    : T extends null | undefined
      ? T
      : // A leaf's VALUE vocabulary comes from the validation intersected
        // alongside (ValidLeaf); offering the token union here as well
        // crossed the two unions member by member in every contextual leaf
        // type. (`undefined` stays: an optional nested block is `X |
        // undefined`, and `unknown` there would swallow `X` itself.)
        unknown

/**
 * One part's editor vocabulary inside a variant rule: the authored element
 * shape minus its static metadata (`$kind`/`$$type` cannot be restated in a
 * variant) and minus forbidden never-valued members.
 *
 * Built from the system, the part's kind and the host ONLY, so it is
 * instantiated once per system and shared by every sheet. Mapping the sheet's
 * own `VariantStyleDef` instead re-resolved every token of every part for
 * each `.variants()` call (~130k instantiations for a five-part sheet).
 */
type VariantEditorElement<
  S extends TokenStyleDeclaration,
  Kind extends ElementType | undefined,
  Host extends Platform | undefined,
> = VariantEditorTop<AuthoredElementStyle<S, Kind, never, Host>>

type VariantEditorTop<T> = {
  [K in keyof T as K extends '$kind' | '$$type'
    ? never
    : [NonNullable<T[K]>] extends [never]
      ? never
      : K]: K extends QueryKey ? T[K] : VariantEditorShape<T[K]>
}

/**
 * The contextual (editor) shape of one variant rule — and, with no named
 * fragments, of an override's rules; see VariantEditorElement. Only the
 * vocabulary lives here: what is VALID is decided by ValidateDeclaration
 * against the full rules type.
 */
export type VariantEditorDef<
  S extends TokenStyleDeclaration,
  Elements extends string,
  Named extends string,
  Kinds extends Record<Elements, ElementType | undefined>,
  Host extends Platform | undefined = undefined,
> = ([Named] extends [never]
  ? unknown
  : {
      $compose?: Named | readonly Named[]
    }) & {
  [E in Elements]?: VariantEditorElement<S, Kinds[E], Host> & {
    $compose?: ComposableParts<Kinds, E> | readonly ComposableParts<Kinds, E>[]
  }
} & {
  [K in VariantConditions<S, Elements>]?: VariantEditorDef<
    S,
    Elements,
    Named,
    Kinds,
    Host
  >
} & {
  [P in Platform as Host extends Platform
    ? P extends Host
      ? `@platform.${P}` | `@platform ${P}`
      : never
    : `@platform.${P}` | `@platform ${P}`]?: VariantEditorDef<
    S,
    Elements,
    Named,
    Kinds,
    P
  >
}

/** Explicit constructor for excess-key checking inside callback return values. */
export type CheckedVariantRules<
  S extends TokenStyleDeclaration,
  Elements extends string,
  Input,
  Kinds extends Record<Elements, ElementType | undefined> = Record<
    Elements,
    undefined
  >,
  Mods extends ModType = ModType,
> = {
  [K in keyof Input]: ValidateDeclaration<
    Input[K],
    VariantStyleDef<
      S,
      Elements,
      ExtractNamedStyles<Input>,
      Kinds,
      K extends `@platform${'.' | ' '}${infer Host extends Platform}`
        ? Host
        : undefined
    >,
    S,
    Elements
  > &
    (K extends QueryKey
      ? ValidQueryKey<K, S, Elements> extends true
        ? unknown
        : never
      : K extends string
        ? string extends K
          ? unknown
          : K extends
                | NamedStyleKey<string>
                | VariantConditions<S, Elements>
                | `@platform.${Platform}`
                | `@platform ${Platform}`
            ? unknown
            : IsCrossElementKey<K, Elements, S> extends true
              ? unknown
              : ValidVariantKey<K, Mods> extends true
                ? unknown
                : never
        : never)
}

/**
 * Callback function type for the new variants API
 */
export type VariantsCallback<
  S extends TokenStyleDeclaration,
  Elements extends string,
  Mods extends ModType,
  Kinds extends Record<Elements, ElementType | undefined> = Record<
    Elements,
    undefined
  >,
> = (
  $: VariantSelector<Mods>,
  q: QueryBuilder<S, Elements>,
) => Record<string, VariantStyleDef<S, Elements, string, Kinds>>

/**
 * Stylesheet with variants() method for adding conditional styles.
 */
type ExtendKinds<Existing, Extension> = {
  [E in (keyof Existing | PickString<ExtractElements<Extension>>) &
    string]: E extends keyof Existing
    ? Existing[E]
    : InferElementType<Extension, E>
}

export interface StylesheetWithVariants<
  S extends TokenStyleDeclaration,
  Elements extends string,
  /** The axes declared so far. Carried so `extend` can hand them back rather
   * than collapsing to `never`, which is what stopped an override from
   * selecting on the axes its target sheet already had. */
  Mods extends ModType = never,
  Kinds extends Record<Elements, ElementType | undefined> = Record<
    Elements,
    undefined
  >,
  Defaults extends object = {},
> {
  /**
   * Define variants with a reusable selector annotation. The declared parts
   * supply query and style completions; inferred rules receive exact-key checks.
   *
   * @example
   * ```ts
   * type Mods = { size?: 's' | 'm'; variant: 'accent' | 'quiet' }
   * stylesheet.variants(($: Variants<Mods>, q) => ({
   *   [$.size('s').variant('accent')]: {
   *     Root: { padding: 2, [q.media('md')]: { padding: 4 } },
   *   },
   * }))
   * ```
   */
  variants<
    M extends ModType,
    const Rules extends Record<string, unknown>,
    const D extends Partial<M> = {},
  >(
    callback: (
      $: VariantSelector<M>,
      q: QueryBuilder<S, Elements>,
    ) => EditorOnly<
      | Rules
      | Record<
          string,
          VariantEditorDef<
            S,
            Elements,
            ExtractNamedStyles<NoInfer<Rules>>,
            Kinds
          >
        >,
      Rules
    > &
      CheckedVariantRules<S, Elements, NoInfer<Rules>, Kinds, M>,
    options?: {
      defaults: D & {
        [K in keyof D]: K extends keyof M ? Exclude<M[K], undefined> : never
      }
    },
  ): Stylesheet<S, Kinds, M, D> &
    StylesheetWithVariants<S, Elements, M, Kinds, D>

  // Explicit legacy type arguments opt into this compatibility signature.
  // Inferred callbacks must not fall through after a checked-overload error.
  variants<M extends ModType = never>(
    callback: [M] extends [never]
      ? never
      : VariantsCallback<S, Elements, NoInfer<M>, Kinds>,
  ): Stylesheet<S, Kinds, M> & StylesheetWithVariants<S, Elements, M, Kinds>

  /**
   * Define variants using an object (legacy API)
   * @deprecated Use callback-based API for better type safety
   */
  variants<M extends ModType>(
    variants: VariantsInput<S, Elements, M>,
  ): Stylesheet<S, Kinds, M> & StylesheetWithVariants<S, Elements, M, Kinds>

  /**
   * Compose a new stylesheet by deep-merging additional rules into this one.
   * The result is itself composable, so `.extend()` and `.variants()` chain in
   * any order.
   *
   * @example
   * ```ts
   * const primary = base.extend({ container: { bgColor: 'action' } })
   * ```
   */
  extend<
    const Extension extends StylesheetInput<
      S,
      Extension,
      Elements | PickString<ExtractElements<Extension>>,
      Kinds
    >,
  >(
    rules: Extension &
      NoInfer<
        StylesheetValidation<
          S,
          Extension,
          Elements | PickString<ExtractElements<Extension>>,
          Kinds
        >
      >,
    /**
     * Variant rules to merge into the sheet's own table, over the SHEET's
     * axes. A matcher the sheet declared is replaced; one it did not is
     * added. Resolved against the sheet's own key order, so
     * `$.size('sm').variant('ghost')` names the same matcher here as it does
     * there regardless of the order it is written in.
     */
    variants?: VariantsCallback<
      S,
      Elements | PickString<ExtractElements<Extension>>,
      Mods,
      ExtendKinds<Kinds, Extension>
    >,
  ): Stylesheet<S, ExtendKinds<Kinds, Extension>, Mods, Defaults> &
    StylesheetWithVariants<
      S,
      Elements | PickString<ExtractElements<Extension>>,
      Mods,
      ExtendKinds<Kinds, Extension>,
      Defaults
    >
}

/**
 * The runtime object `[SYMBOL_INIT]` hands back — structurally the public surface
 * of the `Base` engine. Declared structurally rather than importing `Base` so the
 * types module stays free of a cycle back into the implementation.
 */
export type StylesheetInstance = {
  matchStyles(): void
  getCurrentStyle(key: string): unknown
  applyState(modsState: unknown, context?: unknown): void
  applyElementStyles(context?: unknown): void
  reapplyInteraction(elementKey: string, el: unknown): void
  elementDescriptors(): Array<{ key: string; type?: ElementType }>
}

/**
 * Final stylesheet type - provides element accessors and variant support.
 */
export type Stylesheet<
  S extends TokenStyleDeclaration,
  T extends Record<string, ElementType | undefined>,
  M extends ModType = never,
  Defaults extends object = {},
> = {
  [key in keyof T]: ReturnType<TFun<S>>
} & StylesheetMetadata<S, T, M, Defaults>

/** Named metadata boundary keeps exported inferred sheets declaration-emittable. */
export interface StylesheetMetadata<
  S extends TokenStyleDeclaration,
  T extends Record<string, ElementType | undefined>,
  M extends ModType = never,
  Defaults extends object = {},
> {
  /** @internal */
  [SYMBOL_REF]: TokenSystem<S>
  /**
   * @internal
   *
   * Returns the live `Base` instance, not a bare record: the element accessors
   * are defined on its prototype, and callers (useStyles, the benches) also
   * reach for matchStyles / applyState / getCurrentStyle on it. Typing this as
   * only the element map hid that.
   */
  [SYMBOL_INIT]: (
    config: Config,
    modState?: M,
  ) => StylesheetInstance & {
    [key in keyof T]: ReturnType<TFun<S>>
  }
  /** @internal - prevents type collapse */
  [_internalBrand]?: never

  /**
   * @internal — carries S/T/M so `useStyles` can recover them.
   *
   * Needed because `variants()` and `extend()` return a type that references
   * StylesheetWithVariants, which references them back. That self-reference
   * defeats `X extends Stylesheet<any, any, infer M>`: the match silently fails,
   * InferMods resolves to `never`, and the variant-state argument types out of
   * existence ("Expected 1 arguments, but got 2"). A phantom property is a plain,
   * directly-inferable position, so it survives.
   *
   * A plain property rather than a symbol key: `declare const … unique symbol`
   * has no runtime value, so consumers cannot import it under
   * verbatimModuleSyntax. Optional and never assigned — type domain only.
   */
  readonly __toned__?: { system: S; elements: T; mods: M; defaults: Defaults }
}

/**
 * Pre-variants stylesheet - returned from stylesheet() before .variants() is called.
 */
export type PreVariantsStylesheet<
  S extends TokenStyleDeclaration,
  T extends Record<string, ElementType | undefined>,
  Elements extends string,
> = Stylesheet<S, T, never> &
  StylesheetWithVariants<
    S,
    Elements,
    never,
    { [E in Elements]: E extends keyof T ? T[E] : undefined }
  >

/**
 * Stylesheet factory function type.
 */
export type StylesheetType<S extends TokenStyleDeclaration> = <
  // `const`: without it an element's `$$type: 'view'` literal widens to
  // string during inference and the token constraint silently never applies.
  const T extends StylesheetInput<S, T>,
>(
  style:
    | (T & NoInfer<StylesheetValidation<S, T>>)
    | ((q: QueryBuilder<S>) => T & NoInfer<StylesheetValidation<S, T>>),
) => PreVariantsStylesheet<
  S,
  /*
   * Element name → the ELEMENT TYPE it declared, and nothing more.
   *
   * `overrideStyles` reads this to type its rules, and it needs two things
   * from each element: that the name exists, and which `$$type` constrains
   * its tokens. It reconstructs `AuthoredElementStyle` from those on demand,
   * so the two surfaces cannot drift while the brand stays small — recording
   * the full authored type per element instead pushed the biggest sheets past
   * what tsc will serialize (TS7056), which is what forced them to be
   * exported with their typing erased.
   */
  {
    [K in PickString<ExtractElements<T>>]: InferElementType<
      T,
      K,
      S extends { [DEFAULT_KIND]: 'view' } ? 'view' : undefined
    >
  },
  PickString<ExtractElements<T>>
>

// Forward reference for TokenSystem (defined in system.ts)
import type { TokenSystem } from './system.ts'
