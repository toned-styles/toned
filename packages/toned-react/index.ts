'use client'

import type { QueryBuilder } from '@toned/core/system'
import type { ValidateDeclaration } from '@toned/core/types/stylesheet'

export {
  ConfigProvider,
  type ReactHost,
  type ReactRenderer,
  TonedProvider,
} from './runtime-config.ts'

import {
  type AuthoredElementStyle,
  type ElementType,
  type ModType,
  type NullableOverride as OverrideDeclaration,
  overrideSheet,
  SYMBOL_INIT,
  type TokenStyle,
  type TokenStyleDeclaration,
  type VariantSelector,
} from '@toned/core'
import {
  type ComponentPropsWithRef,
  type ElementType as HostElement,
  type ReactElement,
  type ReactNode,
  useCallback,
  useContext,
  useLayoutEffect,
  useMemo,
  useRef,
} from 'react'
import { bind as _bind, useBind as _useBind } from './bind.tsx'
import { ContainerSizesContext, ContainerStoreContext } from './containers.tsx'
import { createElements as _createElements } from './create-elements.tsx'
import {
  overrideStyles as _overrideStyles,
  isStyleOverrideEntry,
  type StyleOverrideEntry,
  useOverriddenSheet,
} from './overrides.tsx'
import { useRuntimeConfig, VALIDATE_SHEET } from './runtime-config.ts'
import { styleView } from './style-view.ts'
import { useTokenConfig } from './token-config.ts'

/**
 * Props returned for each element in a stylesheet.
 * Includes known properties (style, className) plus dynamic attributes.
 */
type ElementProps<S extends TokenStyleDeclaration = TokenStyleDeclaration> = {
  /** Resolved host fields; use withProps<Host>() for the host's precise style type. */
  style?: Readonly<Record<string, unknown>>
  className?: string
  /** Present so React re-attaches interaction state on commit — safe to spread. */
  ref?: (node: unknown) => void
  /**
   * Merge host props onto this element. Token overrides belong in overrideStyles().
   *
   * Implemented by `addWith` in react-web.ts / react-native.ts, so it exists
   * only when one of those configs is installed — `@toned/react/config` alone
   * has no `getProps` and yields bare elements with no `with`.
   *
   * The return type CARRIES the passed props: `{...s.root.with({ value })}`
   * must still satisfy a consumer whose `value` is required — with() merges
   * className/style/ref/handlers and passes everything else through.
   */
  with: <P extends Record<string, unknown> | false | null | undefined>(
    props: P,
  ) => ElementProps<S> &
    (P extends Record<string, unknown>
      ? Omit<P, 'className' | 'style' | 'ref' | 'with'>
      : {})
  /** Explicit host-prop composition; `with` is its compatibility alias. */
  withProps: <As extends HostElement = 'div'>(
    props:
      | (ComponentPropsWithRef<As> & { [K in `data-${string}`]?: unknown })
      | false
      | null
      | undefined,
  ) => Omit<ElementProps<S>, 'style' | 'ref'> & ComponentPropsWithRef<As>
} & InteractionHandlerProps

/**
 * The event handlers the platform binding attaches when a stylesheet declares
 * runtime interactions for an element (react-web: mouse/focus; react-native:
 * press/hover/focus). Spread them; do not rely on their presence — css pseudo
 * mode attaches none. Typed explicitly rather than through an index signature
 * so `s.el.anything` stopped silently typing as `any`.
 */
type InteractionHandlerProps = Partial<{
  // biome-ignore lint/suspicious/noExplicitAny: platform event types vary
  onMouseEnter: (event: any) => void
  // biome-ignore lint/suspicious/noExplicitAny: platform event types vary
  onMouseLeave: (event: any) => void
  // biome-ignore lint/suspicious/noExplicitAny: platform event types vary
  onMouseDown: (event: any) => void
  // biome-ignore lint/suspicious/noExplicitAny: platform event types vary
  onFocus: (event: any) => void
  // biome-ignore lint/suspicious/noExplicitAny: platform event types vary
  onBlur: (event: any) => void
  // biome-ignore lint/suspicious/noExplicitAny: platform event types vary
  onPressIn: (event: any) => void
  // biome-ignore lint/suspicious/noExplicitAny: platform event types vary
  onPressOut: (event: any) => void
  // biome-ignore lint/suspicious/noExplicitAny: platform event types vary
  onHoverIn: (event: any) => void
  // biome-ignore lint/suspicious/noExplicitAny: platform event types vary
  onHoverOut: (event: any) => void
}>

/** Composition methods on a stylesheet — never element names. */
type StylesheetMethod = 'variants' | 'extend'

/**
 * Base type for stylesheets that can be used with useStyles.
 * Uses structural typing to accept any object with SYMBOL_INIT.
 */
type StylesheetLike = {
  // biome-ignore lint/suspicious/noExplicitAny: dynamic function signature
  [SYMBOL_INIT]: (...args: any[]) => any
}

/**
 * Extract element types from a Stylesheet generic.
 * Uses conditional type inference to pull out the element record T
 * from the Stylesheet<S, T, M> intersection, avoiding index signature pollution.
 */
/**
 * Recover a stylesheet's generic parameters from its phantom brand.
 *
 * Matching `S extends Stylesheet<any, infer T, any>` does NOT work: Stylesheet
 * expands to an intersection containing a mapped type, which TypeScript cannot
 * infer back through. The brand is a plain property, so it can.
 */
/*
 * Recovered from the phantom rather than by matching `Stylesheet<…>`: the
 * stylesheet type is self-referential through StylesheetWithVariants, and that
 * defeats inference through the generic reference.
 */
type InferMeta<S> = S extends { readonly __toned__?: infer Meta } ? Meta : never

type InferElements<S> = InferMeta<S> extends {
  system: infer Sys extends TokenStyleDeclaration
  elements: infer T
}
  ? { [K in keyof T as K extends string ? K : never]: ElementProps<Sys> }
  : {
      // Fallback for a stylesheet without a recoverable brand. Maps EVERY string
      // key, so the composition methods have to be excluded by name — otherwise
      // `s.extend` types as an element and a typo'd element name resolves to it.
      [K in keyof S as K extends StylesheetMethod
        ? never
        : K extends string
          ? K
          : never]: ElementProps
    }

type InferMods<S> = InferMeta<S> extends { mods: infer M } ? M : never
type InferDefaults<S> = InferMeta<S> extends { defaults: infer D } ? D : {}
type InputMods<S> = Omit<InferMods<S>, keyof InferDefaults<S>> &
  Partial<
    Pick<InferMods<S>, Extract<keyof InferDefaults<S>, keyof InferMods<S>>>
  >
type VariantArgs<S> = [InferMods<S>] extends [never]
  ? []
  : {} extends InputMods<S>
    ? [state?: InputMods<S>]
    : [state: InputMods<S>]
export type UseStylesOptions<T extends StylesheetLike> = {
  overrides?: StyleOverrideRules<T> | OverrideEntry<T>
} & ([InferMods<T>] extends [never]
  ? { variants?: never }
  : {} extends InputMods<T>
    ? { variants?: InputMods<T> }
    : { variants: InputMods<T> })

/**
 * Hook to use a stylesheet in a React component.
 *
 * @param stylesheet - The stylesheet created with `stylesheet()` or `stylesheet().variants()`
 * @param state - Optional state object for variant selection
 * @returns An object with element keys that can be spread onto React elements
 *
 * @example
 * ```tsx
 * const s = useStyles(styles, { size: 'm', variant: 'accent' })
 * return <button {...s.container}><span {...s.label}>Click</span></button>
 * ```
 */
export function useStyles<T extends StylesheetLike>(
  stylesheet: T,
  ...args: VariantArgs<T>
): InferElements<T>

export function useStyles<T extends StylesheetLike>(
  stylesheet: T,
  options: UseStylesOptions<T>,
): InferElements<T>

export function useStyles<T extends StylesheetLike>(
  stylesheet: T,
  state?: object,
) {
  const sourceSheet = stylesheet
  // A real axis named "variants" remains legal: its value is scalar, while
  // the options wrapper carries a variants object (or only an overrides map).
  const options =
    state &&
    ((typeof (state as any).variants === 'object' &&
      (state as any).variants !== null) ||
      (typeof (state as any).overrides === 'object' &&
        (state as any).overrides !== null))
      ? (state as { variants?: object; overrides?: any })
      : undefined
  const mods = options ? options.variants : state
  const inherited = useOverriddenSheet(stylesheet)
  const overrides = options?.overrides
  stylesheet = useMemo(() => {
    if (!overrides) return inherited
    const isEntry = isStyleOverrideEntry(overrides)
    if (isEntry && overrides.sheet !== sourceSheet)
      throw new Error('Toned instance override targets a different stylesheet')
    return (
      overrideSheet as (sheet: T, rules: unknown, variants?: unknown) => T
    )(
      inherited,
      isEntry ? overrides.rules : overrides,
      isEntry ? overrides.variantRules : undefined,
    )
  }, [inherited, sourceSheet, overrides])
  const legacySizes = useContext(ContainerSizesContext)
  const containerScope = useContext(ContainerStoreContext)
  const readSizes = useCallback(
    () =>
      containerScope
        ? {
            ...containerScope.store.snapshot(),
            ...(containerScope.legacy === legacySizes ? {} : legacySizes),
          }
        : legacySizes,
    [containerScope, legacySizes],
  )
  const containerSizes = readSizes()
  const committed = useRef<any>(null)
  const config = useTokenConfig(useRuntimeConfig())
  useMemo(
    () => (config as any)[VALIDATE_SHEET]?.(stylesheet),
    [config, stylesheet],
  )
  // A candidate is private to this render. In particular a suspended render
  // cannot publish mods, refs, subscriptions, or token values to the live tree.
  const candidate = stylesheet[SYMBOL_INIT](config, mods)
  candidate.prepare?.(
    committed.current?.stylesheet === sourceSheet
      ? committed.current.candidate
      : undefined,
  )
  const conditions = candidate.conditionState?.(containerSizes)
  if (conditions) {
    Object.assign(candidate.modsState, conditions)
    candidate.matchStyles()
  }
  useLayoutEffect(() => {
    committed.current = { stylesheet: sourceSheet, candidate }
    const unmount = candidate.mount?.()
    const syncMeasurements = () => {
      const conditions = candidate.conditionState?.(readSizes())
      if (conditions) candidate.applyState(conditions)
    }
    const unsubscribe = containerScope?.store.subscribe(syncMeasurements)
    // A measurement can change after render or during child attachment. Read
    // it again in the commit phase before the browser/native host paints.
    if (containerScope) syncMeasurements()
    return () => {
      unsubscribe?.()
      unmount?.()
    }
  }, [candidate, sourceSheet, containerScope, readSizes])
  return styleView(candidate)
}

/**
 * A bound element component (`<s.Root/>`).
 *
 * Without `as`, it renders the primitive its `$$type` selects through the
 * config's `resolveElement`. The host element is configuration, unknown
 * statically, so that signature's props stay open.
 *
 * With `as`, it renders exactly that intrinsic or component, and the props are
 * INFERRED from it: `<s.Root as="button" type="submit"/>` checks against
 * 'button', `<s.Root as={Comp}/>` against Comp's own props — required props
 * required, wrong values rejected. The no-`as` signature forbids `as`
 * entirely, so a mistyped `as` call cannot fall through to the open signature
 * and silently pass.
 */
type BoundCallable = {
  <As extends HostElement>(
    props: { as: As } & Omit<ComponentPropsWithRef<As>, 'as'>,
  ): ReactElement
  (props?: { as?: never } & Record<string, unknown>): ReactElement
}

/**
 * A bound stylesheet: each declared element becomes a component that renders the
 * primitive its `$$type` selects (via the config's `resolveElement`) — or the
 * `as` target — with the resolved styles applied, and ALSO carries the raw
 * prop-bag (`.with`/`.style`/`.className`) for escape-hatch spreading. Keys are
 * exactly the declared elements — `s.Nope` is a compile error, not `any`.
 */
type BoundElementsOf<T> = {
  [K in keyof InferElements<T>]: BoundCallable & InferElements<T>[K]
}

/** Stable parts and an optional, hostless variant provider. Parts used outside
 * their family provider resolve base styles plus declared defaults. */
export type ElementsOf<T> = ((
  props: ([InferMods<T>] extends [never] ? {} : InputMods<T>) & {
    children?: ReactNode
  },
) => ReactElement) & { [K in keyof InferElements<T>]: BoundCallable }

type ReservedElementName =
  | keyof Function
  | 'displayName'
  | '$$typeof'
  | 'render'
  | 'defaultProps'
  | 'propTypes'
type ElementsConstraint<T> = Extract<
  keyof InferElements<T>,
  ReservedElementName
> extends never
  ? [InferMods<T>] extends [never]
    ? unknown
    : Extract<keyof InferMods<T>, 'children' | 'key' | 'ref'> extends never
      ? unknown
      : { readonly 'Toned: variant axes cannot be children, key or ref': never }
  : { readonly 'Toned: part name conflicts with component metadata': never }

/** Call at module scope; no host configuration or token values are read here. */
export const createElements = _createElements as unknown as <
  T extends StylesheetLike,
>(
  stylesheet: T & ElementsConstraint<T>,
) => ElementsOf<T>

/**
 * Mod-less module-level binding for a stylesheet with no variants:
 * `const { Root, Label } = bind(styles)`. The general form is `useBind`.
 */
export const bind = _bind as <T extends StylesheetLike>(
  stylesheet: T,
) => BoundElementsOf<T>

/**
 * The bound counterpart of `useStyles`: same arguments (mods in the hook call),
 * returns components (`<s.Root/>`) that also carry the raw prop-bag. Mods are
 * typed exactly as `useStyles`' — required iff the stylesheet declares them, and
 * only declared values accepted.
 */
/**
 * Partial rules accepted as an override of T: any subset of its elements, each
 * a token style of its system. Nested pseudo/breakpoint blocks are allowed and
 * deep-merge into the sheet's own.
 */
export type StyleOverrideRules<T extends StylesheetLike> =
  InferMeta<T> extends {
    system: infer Sys extends TokenStyleDeclaration
    elements: infer E
  }
    ? {
        [K in keyof E as K extends string ? K : never]?: OverrideDeclaration<
          AuthoredElementStyle<
            Sys,
            E[K] extends ElementType | undefined ? E[K] : undefined
          >
        >
      } & {
        /** Cross-element channel keys ('Source:hover', 'Source~:<state>') ride
         * the override's base rules; the matcher resolves them on the derived
         * sheet exactly as on an authored one. */
        [K in
          | `${keyof E & string}:${string}`
          | `${keyof E & string}~:${string}`]?: {
          [T2 in keyof E as T2 extends string
            ? T2
            : never]?: OverrideDeclaration<TokenStyle<Sys>>
        }
      }
    : Record<string, TokenStyle<TokenStyleDeclaration>>

/** Pair a stylesheet with override rules, type-checked against the sheet.
 * `scope` gates the entry on the host's ambient scope channel (see
 * Config.useStyleOverrideScope — the haelo host feeds symbiote's zone path). */
/**
 * What an override may say about one matcher: the sheet's elements, each
 * taking what the stylesheet's own element rules take.
 *
 * Deliberately NOT `StyleOverrideRules`, which also carries the cross-element
 * channel keys. Those are template-literal keys, and an intersection holding
 * one accepts any string, which switches excess-property checking off for the
 * whole object — an unknown element name would then pass here while the
 * stylesheet rejects it.
 */
export type StyleOverrideVariantRules<T extends StylesheetLike> =
  InferMeta<T> extends {
    system: infer Sys extends TokenStyleDeclaration
    elements: infer E
  }
    ? { $compose?: string | string[] } & {
        [K in keyof E as K extends string ? K : never]?: OverrideDeclaration<
          AuthoredElementStyle<
            Sys,
            E[K] extends ElementType | undefined ? E[K] : undefined
          >
        >
      }
    : Record<string, AuthoredElementStyle<TokenStyleDeclaration>>

/**
 * An override entry, with the stylesheet's own `.variants()` on it.
 *
 * `$` is built from the TARGET sheet's axes, so an override selects on what
 * the component already passes to `useBind` — there are no new axes to
 * invent, and one that could be invented would be dead code that type-checks.
 * A matcher the sheet declared is replaced; one it did not is added.
 */
type OverrideSystem<T> = InferMeta<T> extends {
  system: infer S extends TokenStyleDeclaration
}
  ? S
  : TokenStyleDeclaration
type OverrideParts<T> = InferMeta<T> extends { elements: infer E }
  ? keyof E & string
  : string
export interface OverrideEntry<T extends StylesheetLike>
  extends StyleOverrideEntry {
  variants<const Rules extends Record<string, unknown>>(
    callback: (
      selector: VariantSelector<
        InferMods<T> extends ModType ? InferMods<T> : never
      >,
      q: QueryBuilder<OverrideSystem<T>, OverrideParts<T>>,
    ) => Rules &
      ValidateDeclaration<
        Rules,
        Record<string, StyleOverrideVariantRules<T>>,
        OverrideSystem<T>
      >,
  ): OverrideEntry<T>
}

export const overrideStyles = _overrideStyles as <
  T extends StylesheetLike,
  const Rules extends StyleOverrideRules<T>,
>(
  sheet: T,
  rules:
    | (Rules &
        ValidateDeclaration<Rules, StyleOverrideRules<T>, OverrideSystem<T>>)
    | ((
        q: QueryBuilder<OverrideSystem<T>, OverrideParts<T>>,
      ) => Rules &
        ValidateDeclaration<Rules, StyleOverrideRules<T>, OverrideSystem<T>>),
  opts?: { scope?: string },
) => OverrideEntry<T>

export { ContainerSizesContext } from './containers.tsx'
export type { StyleOverrideEntry } from './overrides.tsx'
export { StyleOverrides } from './overrides.tsx'

/**
 * An EXPORTABLE stylesheet type for override targeting. A full sheet's
 * inferred type can exceed TypeScript's declaration-emit limits (TS7056), so
 * a module exporting its sheet for `overrideStyles` annotates with this —
 * trading per-element rule typing at foreign call sites for an emittable
 * declaration. Inside the owning module, `typeof <sheet>` stays fully typed.
 */
export type OverridableStylesheet = StylesheetLike

export const useBind = _useBind as <T extends StylesheetLike>(
  stylesheet: T,
  ...args: VariantArgs<T>
) => BoundElementsOf<T> & {
  readonly $props: InferElements<T>
  $scope: (children: ReactNode) => ReactElement
}
