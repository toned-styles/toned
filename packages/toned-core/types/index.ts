/**
 * Core type definitions for the toned styling system.
 *
 * @module types
 */

export type { _symInit, _symRef } from '../utils/symbols.ts'
// Only export SYMBOL_INIT publicly (used by toned-react)
// Other symbols are internal and should be imported from utils/symbols.ts directly
export { SYMBOL_INIT } from '../utils/symbols.ts'
// Config types
export type { Config, HostConditions, Platform } from './config.ts'
export type { PortableTokenStyle } from './style.ts'
// Stylesheet types.
// StylesheetInstance and the brand declarations (_internalBrand, _symRef,
// _symInit) are exported so a host package can EXPORT a stylesheet: without
// public names for them, declaration emission dies on TS4023 at every
// `export const styles = stylesheet(...)` that crosses a package boundary.
export type {
  _internalBrand,
  AuthoredElementStyle,
  DefaultSystemKind,
  ElementMap,
  ElementStyleNew,
  ExtractElements,
  ExtractNamedStyles,
  InferElementType,
  ModType,
  NamedStyleDef,
  NamedStyleKey,
  PickString,
  PreVariantsStylesheet,
  Pseudo,
  ResolvedTokenStyle,
  Stylesheet,
  StylesheetInput,
  StylesheetInstance,
  StylesheetMetadata,
  StylesheetType,
  StylesheetWithVariants,
  TFun,
  VariantElementStyle,
  VariantKey,
  VariantSelector,
  VariantStyleDef,
  VariantsCallback,
  VariantsInput,
} from './stylesheet.ts'
// System types
export type { TokenSystem } from './system.ts'
export type {
  AnimationDefinition,
  AnimationInput,
  AnimationKeyframes,
  Breakpoints,
  BridgeConfig,
  ElementType,
  InlineStyle,
  ResolveContext,
  TokenAlphaConfig,
  TokenConfig,
  TokenKeys,
  TokenStyle,
  TokenStyleDeclaration,
  Tokens,
  TokenTypeConfig,
} from './tokens.ts'
// Token types
export { isAnimationDefinition } from './tokens.ts'
