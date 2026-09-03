import {
  getConfig,
  SYMBOL_INIT,
  type TokenStyle,
  type TokenStyleDeclaration,
} from '@toned/core'
import { useRef } from 'react'

/**
 * Props returned for each element in a stylesheet.
 * Includes known properties (style, className) plus dynamic attributes.
 */
type ElementProps<S extends TokenStyleDeclaration = TokenStyleDeclaration> = {
  // biome-ignore lint/suspicious/noExplicitAny: dynamic style object
  style?: Record<string, any>
  className?: string
  /**
   * Layer one-off token styles (and plain props) onto this element.
   *
   * Implemented by `addWith` in react-web.ts / react-native.ts, so it exists
   * only when one of those configs is installed — `@toned/react/config` alone
   * has no `getProps` and yields bare elements with no `with`.
   */
  with: (props: TokenStyle<S> | Record<string, unknown> | false | null | undefined) => ElementProps<S>
  // biome-ignore lint/suspicious/noExplicitAny: dynamic element attributes
  [key: string]: any
}

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

  if (ref.current?.state !== state) {
    ref.current.result.applyState(state)
    // Record what was applied so a caller holding a STABLE mods object skips
    // applyState entirely on re-render. (An inline literal still differs by
    // identity every render; for those, applyState's own value-equality check
    // is the short-circuit.) Without this line the guard never held for anyone.
    ref.current.state = state
  }

  return ref.current?.result
}
