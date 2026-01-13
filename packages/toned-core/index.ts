/**
 * @toned/core - Token-based styling system
 *
 * @module @toned/core
 */

export type { TokenSystem } from './system/index.ts'
// System definition and configuration
export {
  defineConfig,
  defineSystem,
  defineToken,
  defineUnit,
  getConfig,
  setConfig,
} from './system/index.ts'

// Re-export types for convenience
export type {
  Breakpoints,
  Config,
  ModType,
  Pseudo,
  Stylesheet,
  StylesheetInput,
  StylesheetType,
  TokenConfig,
  TokenStyle,
  TokenStyleDeclaration,
  Tokens,
} from './types/index.ts'

// Re-export only public symbols (SYMBOL_INIT needed by toned-react)
export { SYMBOL_INIT } from './types/index.ts'
