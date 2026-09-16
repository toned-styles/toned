/**
 * @toned/core - Token-based styling system
 *
 * @module @toned/core
 */

export type {
  GridArea,
  GridDefinition,
  GridPlacement,
  GridTrack,
} from './grid/index.ts'
export { defineGrid, dp, fr, percent } from './grid/index.ts'
export type { TonedTypeRegistry } from './registry.ts'
export type { SystemDefinition, SystemOptions } from './system/definers.ts'
export type {
  Condition,
  ContainerConditionBuilder,
  Palette,
  PaletteConfig,
  ThemeMeta,
  ThemeValue,
  TokenSystem,
} from './system/index.ts'
// System definition and configuration
export {
  and,
  bp,
  cq,
  defineAnimations,
  defineConfig,
  definePalette,
  defineSystem,
  defineToken,
  defineUnit,
  getConfig,
  not,
  or,
  setConfig,
} from './system/index.ts'
export type {
  QueryAtom,
  QueryBuilder,
  QueryPredicate,
} from './system/queries.ts'
// Re-export types for convenience
// Type-only brands, exported so downstream declaration emission can name a
// stylesheet's inferred type across package boundaries (TS4023 otherwise).
export type {
  _internalBrand,
  _symInit,
  _symRef,
  AnimationDefinition,
  AnimationInput,
  AnimationKeyframes,
  AuthoredElementStyle,
  Breakpoints,
  BridgeConfig,
  Config,
  ElementStyleNew,
  ElementType,
  ModType,
  Platform,
  Pseudo,
  ResolveContext,
  Stylesheet,
  StylesheetInput,
  StylesheetInstance,
  StylesheetType,
  TokenConfig,
  TokenStyle,
  TokenStyleDeclaration,
  Tokens,
  TokenTypeConfig,
  VariantSelector,
} from './types/index.ts'
// Re-export only public symbols (SYMBOL_INIT needed by toned-react)
export { SYMBOL_INIT } from './types/index.ts'
export type {
  NativeInlineStyle,
  PlatformStyle,
  PortableInlineStyle,
  WebInlineStyle,
} from './types/style.ts'
export { bridgeVarName } from './utils/css.ts'
