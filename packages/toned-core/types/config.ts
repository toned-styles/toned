/**
 * Configuration type definitions.
 *
 * @module types/config
 */

import type { Tokens } from './tokens.ts'

/**
 * Runtime configuration for the styling system.
 */
export type Config = Readonly<{
  /** Returns the token values for style resolution */
  getTokens: () => Tokens

  /** Whether to use CSS class names for static token values */
  useClassName: boolean

  /** Whether to use media query matching for breakpoints */
  useMedia: boolean

  /** Enable debug logging */
  debug: boolean

  /** Get props for an element - returns style/className based on config */
  // biome-ignore lint/suspicious/noExplicitAny: context type varies by usage
  getProps(this: any, elementKey: string): Record<string, unknown>

  /** Initialize ref handling */
  initRef: () => void

  /** Initialize interaction state handling */
  initInteraction: () => void
}>
