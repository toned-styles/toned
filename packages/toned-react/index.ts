import { getConfig } from '@toned/core/config.js'
import { SYMBOL_INIT } from '@toned/core/types.js'

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
type StylesheetElements<T> = Exclude<keyof T, symbol | 'variants' | 'extend'>

/**
 * Result type for useStyles - provides element props for each element in the stylesheet
 */
type UseStylesResult<T> = {
  [K in StylesheetElements<T>]: ElementProps
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

export function useStyles<T extends StylesheetLike, M extends object>(
  stylesheet: T,
  state: M,
): UseStylesResult<T>

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
