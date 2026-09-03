/**
 * Core type definitions for the toned styling system.
 *
 * @module types
 */

// Only export SYMBOL_INIT publicly (used by toned-react)
// Other symbols are internal and should be imported from utils/symbols.ts directly
export { SYMBOL_INIT } from '../utils/symbols.ts'
export type { _symInit, _symRef } from '../utils/symbols.ts'
export type { _internalBrand } from './stylesheet.ts'
// Config types
export type { Config, Platform } from './config.ts'
// Stylesheet types.
// StylesheetInstance and the brand declarations (_internalBrand, _symRef,
// _symInit) are exported so a host package can EXPORT a stylesheet: without
// public names for them, declaration emission dies on TS4023 at every
// `export const styles = stylesheet(...)` that crosses a package boundary.
export type {
  ElementMap,
  StylesheetInstance,
  ElementStyleNew,
  ExtractElements,
  ExtractNamedStyles,
  ModType,
  NamedStyleDef,
  NamedStyleKey,
  PickString,
  PreVariantsStylesheet,
  Pseudo,
  Stylesheet,
  StylesheetInput,
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
// Token types
export { isAnimationDefinition } from './tokens.ts'
export type {
  AnimationDefinition,
  AnimationInput,
  AnimationKeyframes,
  Breakpoints,
  InlineStyle,
  ElementType,
  TokenAlphaConfig,
  TokenConfig,
  TokenTypeConfig,
  TokenKeys,
  TokenStyle,
  TokenStyleDeclaration,
  Tokens,
} from './tokens.ts'
