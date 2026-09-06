import {
  type AuthoredElementStyle,
  getConfig,
  type ModType,
  SYMBOL_INIT,
  type TokenStyle,
  type TokenStyleDeclaration,
  type VariantSelector,
} from '@toned/core'
import {
  type ComponentPropsWithRef,
  type ElementType as HostElement,
  type ReactElement,
  useContext,
  useRef,
} from 'react'
import { bind as _bind, useBind as _useBind } from './bind.tsx'
import { ContainerSizesContext } from './containers.tsx'
import {
  overrideStyles as _overrideStyles,
  type StyleOverrideEntry,
  useOverriddenSheet,
} from './overrides.tsx'

/**
 * Props returned for each element in a stylesheet.
 * Includes known properties (style, className) plus dynamic attributes.
 */
type ElementProps<S extends TokenStyleDeclaration = TokenStyleDeclaration> = {
  // biome-ignore lint/suspicious/noExplicitAny: dynamic style object
  style?: Record<string, any>
  className?: string
  /** Present so React re-attaches interaction state on commit — safe to spread. */
  // biome-ignore lint/suspicious/noExplicitAny: platform node type varies
  ref?: (node: any) => void
  /**
   * Layer one-off token styles (and plain props) onto this element.
   *
   * Implemented by `addWith` in react-web.ts / react-native.ts, so it exists
   * only when one of those configs is installed — `@toned/react/config` alone
   * has no `getProps` and yields bare elements with no `with`.
   *
   * The return type CARRIES the passed props: `{...s.root.with({ value })}`
   * must still satisfy a consumer whose `value` is required — with() merges
   * className/style/ref/handlers and passes everything else through.
   */
  with: <
    P extends
      | TokenStyle<S>
      | Record<string, unknown>
      | false
      | null
      | undefined,
  >(
    props: P,
  ) => ElementProps<S> &
    (P extends Record<string, unknown>
      ? Omit<P, 'className' | 'style' | 'ref' | 'with'>
      : {})
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
  ...args: InferMods<T> extends never ? [] : [state: InferMods<T>]
): InferElements<T>

export function useStyles<T extends StylesheetLike>(
  stylesheet: T,
  state?: object,
) {
  // An ancestor may have overridden this sheet for the subtree (see
  // overrides.tsx); everything below resolves the derived sheet instead.
  stylesheet = useOverriddenSheet(stylesheet)
  // Runtime container queries: the nearest measured ancestor sizes. Read
  // unconditionally (hooks); folded into the applied state only when the
  // resolved sheet actually queries a condition — conditionState answers null
  // otherwise, and in css mode always (the matcher flattened the keys away).
  const containerSizes = useContext(ContainerSizesContext)
  const ref = useRef<{
    stylesheet: T
    state?: object
    // biome-ignore lint/suspicious/noExplicitAny: dynamic result type
    result: any
  }>(null)

  if (ref.current?.stylesheet !== stylesheet) {
    const config = getConfig()
    ref.current = {
      stylesheet,
      state,
      result: stylesheet[SYMBOL_INIT](config, state),
    }
  }

  const cqState = ref.current.result.conditionState?.(containerSizes) as
    | Record<string, boolean>
    | null
    | undefined
  // A container-querying sheet applies a MERGED state each render (a fresh
  // object, so the identity guard below never holds for it — applyState's own
  // value-equality check is its short-circuit). Everyone else keeps the
  // identity fast path untouched.
  const applied = cqState ? { ...state, ...cqState } : state

  if (ref.current?.state !== applied) {
    ref.current.result.applyState(applied)
    // Record what was applied so a caller holding a STABLE mods object skips
    // applyState entirely on re-render. (An inline literal still differs by
    // identity every render; for those, applyState's own value-equality check
    // is the short-circuit.) Without this line the guard never held for anyone.
    ref.current.state = applied
  }

  return ref.current?.result
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
        [K in keyof E as K extends string
          ? K
          : never]?: AuthoredElementStyle<Sys>
      } & {
        /** Cross-element channel keys ('Source:hover', 'Source~:<state>') ride
         * the override's base rules; the matcher resolves them on the derived
         * sheet exactly as on an authored one. */
        [K in
          | `${keyof E & string}:${string}`
          | `${keyof E & string}~:${string}`]?: {
          [T2 in keyof E as T2 extends string ? T2 : never]?: TokenStyle<Sys>
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
        [K in keyof E as K extends string
          ? K
          : never]?: AuthoredElementStyle<Sys>
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
export interface OverrideEntry<T extends StylesheetLike>
  extends StyleOverrideEntry {
  variants(
    callback: (
      selector: VariantSelector<
        InferMods<T> extends ModType ? InferMods<T> : never
      >,
    ) => Record<string, StyleOverrideVariantRules<T>>,
  ): OverrideEntry<T>
}

export const overrideStyles = _overrideStyles as <T extends StylesheetLike>(
  sheet: T,
  rules: StyleOverrideRules<T>,
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
  ...args: InferMods<T> extends never ? [] : [state: InferMods<T>]
) => BoundElementsOf<T>
