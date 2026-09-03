/**
 * @toned/core - Token-based styling system
 *
 * @module @toned/core
 */

export type { TokenSystem } from './system/index.ts'
// System definition and configuration
export {
  defineAnimations,
  defineConfig,
  defineSystem,
  defineToken,
  defineUnit,
  getConfig,
  setConfig,
} from './system/index.ts'

// Re-export types for convenience
export type {
  AnimationDefinition,
  BridgeConfig,
  AnimationInput,
  AnimationKeyframes,
  Breakpoints,
  Config,
  ElementType,
  Platform,
  ModType,
  Pseudo,
  Stylesheet,
  StylesheetInput,
  StylesheetType,
  TokenConfig,
  TokenTypeConfig,
  TokenStyle,
  TokenStyleDeclaration,
  Tokens,
} from './types/index.ts'

export type { TonedTypeRegistry } from './registry.ts'
export { bridgeVarName } from './utils/css.ts'
// Re-export only public symbols (SYMBOL_INIT needed by toned-react)
export { SYMBOL_INIT } from './types/index.ts'
// Type-only brands, exported so downstream declaration emission can name a
// stylesheet's inferred type across package boundaries (TS4023 otherwise).
export type { _internalBrand, _symInit, _symRef, StylesheetInstance } from './types/index.ts'
