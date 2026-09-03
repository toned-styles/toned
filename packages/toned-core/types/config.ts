/**
 * Configuration type definitions.
 *
 * @module types/config
 */

import type { ElementType, Tokens } from './tokens.ts'

/**
 * Runtime configuration for the styling system.
 */
/**
 * The platforms a stylesheet can address with `'@platform.<name>'` keys.
 * A key matching the running config's `platform` merges into its parent;
 * every other platform's key is dropped before compilation.
 */
export type Platform = 'web' | 'native'

export type Config = Readonly<{
  /** Returns the token values for style resolution */
  getTokens: () => Tokens

  /**
   * Parameter custom property → element prop, for platforms that surface a
   * bridge as a PROP rather than CSS (react-native: placeholderTextColor,
   * selectionColor). The binding ships conventional defaults; a host may
   * extend via setConfig. Values are moved out of `style` into props by
   * getProps.
   */
  bridgeProps?: Record<string, string>

  /**
   * Which platform this runtime is. Set by the platform binding
   * (react-web → 'web', react-native → 'native'); resolves
   * `'@platform.<name>'` stylesheet keys. Unset means no platform keys apply.
   */
  platform?: Platform

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

  /**
   * Maps an element's `$$type` to the host element a binding should render for
   * it — a React intrinsic tag on web (`view`→`'div'`), a component for native
   * or a host override (e.g. haelo-primitives `View`/`Text`/`Image`).
   *
   * Only bindings (useBind/bind) read this; `getProps`-based useStyles ignores
   * it. Optional and absent on the bare default config, so useBind throws a
   * named error when it is missing rather than rendering the wrong element.
   */
  resolveElement?: (type?: ElementType) => unknown

  /** Initialize ref handling */
  initRef: () => void

  /** Initialize interaction state handling */
  initInteraction: () => void
}>
