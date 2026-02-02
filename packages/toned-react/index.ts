import {
  getConfig,
  type ModType,
  type Stylesheet,
  SYMBOL_INIT,
  type TokenStyle,
  type TokenStyleDeclaration,
} from '@toned/core'
import type { SYMBOL_REF } from '@toned/core/utils'

import { useRef } from 'react'

/**
 * Props returned for each element in a stylesheet.
 * Includes known properties (style, className) plus dynamic attributes.
 */
type ElementProps = {
  // biome-ignore lint/suspicious/noExplicitAny: dynamic style object
  style?: Record<string, any>
  className?: string
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
 * Extract element keys from a stylesheet (excluding internal symbols and methods)
 */
// type StylesheetElements<T> = Exclude<keyof T, symbol | 'variants' | 'extend'>

/**
 * Result type for useStyles - provides element props for each element in the stylesheet
 */
type UseStylesResult<T> = {
  [K in keyof T as K extends typeof SYMBOL_INIT | typeof SYMBOL_REF
    ? never
    : K]: ElementProps
}

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
): UseStylesResult<T>

export function useStyles<
  S extends TokenStyleDeclaration,
  T extends Record<string, TokenStyle<S>>,
  M extends ModType,
>(stylesheet: Stylesheet<S, T, M>, state: M): UseStylesResult<T>

export function useStyles<T extends StylesheetLike>(
  stylesheet: T,
  state?: object,
) {
  const ref = useRef<{
    stylesheet: T
    state?: object
    result: UseStylesResult<T>
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
    // @ts-expect-error hidden API
    ref.current.result.applyState(state)
  }

  return ref.current?.result
}
