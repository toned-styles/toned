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

  /**
   * The ambient SCOPE for stylesheet overrides — the host integration's hook
   * (React rules apply: it is called unconditionally on every override
   * resolution, so it must be a hook or a plain stable function). A scoped
   * override entry (overrideStyles(sheet, rules, { scope })) applies only
   * where matchStyleOverrideScope(entry.scope, ambient) holds. Unset: scoped
   * entries never apply.
   */
  useStyleOverrideScope?: () => string | null | undefined

  /**
   * Whether a scoped entry applies at the ambient scope. The default
   * (overrides.tsx) treats both as '/'-delimited paths and matches when the
   * entry's scope appears in the ambient path as a contiguous run of whole
   * segments — 'checkout/summary' applies under '__root__/checkout/summary/x'.
   */
  matchStyleOverrideScope?: (scope: string, ambient: string | null | undefined) => boolean

  /**
   * Props that make an element report its own inline width, for the runtime
   * container-query half (mediaMode 'runtime'): the binding spreads them onto
   * an element that declares `container: '<name>'` and provides the reported
   * width to descendant sheets. Platform-owned — react-native answers with an
   * `onLayout` handler; a web runtime host could answer with a
   * ResizeObserver-attaching ref. Unset: container elements render unmeasured
   * and every container condition stays false.
   */
  measureContainerProps?: (
    onSize: (width: number) => void,
  ) => Record<string, unknown>

  /**
   * The runtime half of the ':rtl' declared state (whose web half is a
   * `:dir(rtl)` toggle in the generated css): when set, conditionState
   * answers every `<element>:rtl` mod from it. Host-owned, like
   * resolveElement — a native binding wires I18nManager here; unset, ':rtl'
   * never matches at runtime.
   */
  getDirection?: () => 'ltr' | 'rtl'

  /** Initialize ref handling */
  initRef: () => void

  /** Initialize interaction state handling */
  initInteraction: () => void
}>
