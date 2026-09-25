/**
 * @toned/core - Token-based styling system
 *
 * @module @toned/core
 */

export type {
  LayoutContext,
  LogicalLength,
  PortableColor,
  ThemeReference,
} from './core/values.ts'
export { dp, percent, rgba, themeRef } from './core/values.ts'
export type {
  GridArea,
  GridDefinition,
  GridInput,
  GridPlacement,
  GridTrack,
} from './grid/index.ts'
export { defineGrid, fr } from './grid/index.ts'
export type { TonedTypeRegistry } from './registry.ts'
export {
  type NullableOverride,
  type OverrideSheetRules,
  overrideSheet,
} from './stylesheet/overrideSheet.ts'
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
export type {
  SystemTheme,
  ThemeContract,
  ThemeTokenFactory,
} from './system/theme-types.ts'
export { defineTokenFor } from './system/theme-types.ts'
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
  DefaultSystemKind,
  ElementStyleNew,
  ElementType,
  HostConditions,
  ModType,
  Platform,
  PreVariantsStylesheet,
  Pseudo,
  ResolveContext,
  ResolvedTokenStyle,
  Stylesheet,
  StylesheetInput,
  StylesheetInstance,
  StylesheetMetadata,
  StylesheetType,
  StylesheetWithVariants,
  TokenConfig,
  TokenStyle,
  TokenStyleDeclaration,
  Tokens,
  TokenTypeConfig,
  VariantSelector,
  Variants,
} from './types/index.ts'
// Re-export only public symbols (SYMBOL_INIT needed by toned-react)
export { SYMBOL_INIT } from './types/index.ts'
export type {
  NativeInlineStyle,
  PlatformStyle,
  PortableInlineStyle,
  PortableTokenStyle,
  WebInlineStyle,
} from './types/style.ts'
export { alpha } from './utils/alpha.ts'
export { bridgeVarName } from './utils/css.ts'
export {
  compileWebRules,
  isWebRules,
  type WebRuleStyle,
  type WebRules,
  webRules,
} from './web/rules.ts'
