import { getConfig, type Stylesheet, SYMBOL_INIT } from '@toned/core'
import { useRef } from 'react'

/**
 * Props returned for each element in a stylesheet.
 * Includes known properties (style, className) plus dynamic attributes.
 */
type ElementProps = {
  // biome-ignore lint/suspicious/noExplicitAny: dynamic style object
  style?: Record<string, any>
  className?: string
  // biome-ignore lint/suspicious/noExplicitAny: dynamic merge result
  with: (props: Record<string, any> | false | null | undefined) => ElementProps
  // biome-ignore lint/suspicious/noExplicitAny: dynamic element attributes
  [key: string]: any
}

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
type InferElements<S> = S extends Stylesheet<
  // biome-ignore lint/suspicious/noExplicitAny: inference wildcard
  any,
  infer T,
  // biome-ignore lint/suspicious/noExplicitAny: inference wildcard
  any
>
  ? { [K in keyof T as K extends string ? K : never]: ElementProps }
  : { [K in keyof S as K extends string ? K : never]: ElementProps }

/**
 * Infer the mods type from a Stylesheet generic.
 */
type InferMods<S> = S extends Stylesheet<
  // biome-ignore lint/suspicious/noExplicitAny: inference wildcard
  any,
  // biome-ignore lint/suspicious/noExplicitAny: inference wildcard
  any,
  infer M
>
  ? M
  : never

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
  }

  return ref.current?.result
}
