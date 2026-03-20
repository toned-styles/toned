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

  /**
   * Media query handling mode:
   * - 'runtime': JS-based matchMedia listeners (default, works everywhere)
   * - 'css': CSS custom property space-toggle (precompiled, web only)
   * - false: disable media queries entirely
   */
  mediaMode: 'runtime' | 'css' | false

  /**
   * Pseudo-state handling mode (:hover, :focus, :active):
   * - 'runtime': JS event handlers update styles imperatively (default, works everywhere)
   * - 'css': CSS custom property space-toggle (no JS needed, web only)
   * - false: disable pseudo-state handling entirely
   */
  pseudoMode: 'runtime' | 'css' | false

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
