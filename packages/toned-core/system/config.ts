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
