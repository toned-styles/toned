/**
 * Global configuration management for the toned styling system.
 *
 * @module system/config
 */

import type { Config, Tokens } from '../types/index.ts'

const SYMBOL_CONFIG = Symbol.for('@toned/core/CONFIG')

const customGlobal = globalThis as typeof globalThis & {
  [SYMBOL_CONFIG]: Config
}

customGlobal[SYMBOL_CONFIG] ??= {
  getTokens: (): Tokens => ({}),

  useClassName: false,
  useMedia: false,
  mediaMode: 'runtime',
  pseudoMode: 'runtime',
  debug: false,

  // Default getProps returns empty object - overridden by toned-react with actual style/className props
  getProps() {
    return {}
  },

  initRef: () => {},
  initInteraction: () => {},
}

const config = customGlobal[SYMBOL_CONFIG]

/**
 * Get the current global configuration.
 */
export function getConfig(): Config {
  return config
}

/**
 * Update the global configuration in-place.
 */
export function setConfig(newConfig: Partial<typeof config>) {
  return Object.assign(config, newConfig)
}

/**
 * Create a new configuration object merged with defaults.
 */
export function defineConfig(newConfig: Partial<typeof config>) {
  return Object.assign({}, config, newConfig)
}

/**
 * Resolve the media and pseudo handling modes of a config.
 *
 * `Config` declares both as required, but configs are assembled by hand and by
 * `Partial` overrides, so either can arrive undefined. Everything that branches
 * on a mode — `StyleMatcher`'s flattening and `exec`'s custom property chains —
 * must agree on the answer, so they all read it from here.
 */
export function resolveModes(
  config: Partial<Pick<Config, 'mediaMode' | 'pseudoMode' | 'useMedia'>>,
): Pick<Config, 'mediaMode' | 'pseudoMode'> {
  return {
    mediaMode: config.mediaMode ?? (config.useMedia ? 'runtime' : false),
    pseudoMode: config.pseudoMode ?? 'runtime',
  }
}
