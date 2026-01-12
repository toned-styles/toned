import type { Config, Tokens } from './types.ts'

const SYMBOL_CONFIG = Symbol.for('@toned/core/CONFIG')

const customGlobal = globalThis as typeof globalThis & {
  [SYMBOL_CONFIG]: Config
}

customGlobal[SYMBOL_CONFIG] ??= {
  getTokens: (): Tokens => ({}),

  useClassName: false,
  useMedia: false,
  debug: false,

  // TODO
  getProps() {
    return {}
  },

  initRef: () => {},
  initInteraction: () => {},
}

const config = customGlobal[SYMBOL_CONFIG]

export function getConfig(): Config {
  return config
}

export function setConfig(newConfig: Partial<typeof config>) {
  return Object.assign(config, newConfig)
}

export function defineConfig(newConfig: Partial<typeof config>) {
  return Object.assign({}, config, newConfig)
}
