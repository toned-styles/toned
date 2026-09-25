/**
 * Stylesheet creation and management.
 *
 * @module stylesheet
 */

export type { Variants } from '../types/stylesheet.ts'

export { initMedia } from './media.ts'
export {
  defineReactNativeHost,
  type NativeHostAdapter,
  type NativePatch,
  nativeHostAdapter,
  registerNativeHost,
} from './native-host.ts'
export {
  type NullableOverride,
  type OverrideSheetRules,
  overrideSheet,
} from './overrideSheet.ts'
export { stylesheetParts, stylesheetVariantAxes } from './plans.ts'
export { StyleMatcher } from './StyleMatcher.ts'
export { Base, createStylesheet } from './StyleSheet.ts'
export { unitlessNumbers } from './unitlessNumbers.ts'
export {
  createVariantSelector,
  type ExtractNamedStyles,
  getNamedStyleName,
  isNamedStyleKey,
  isNoneValue,
  type NamedStyleKey,
  type VariantBuilder,
  type VariantKey,
  type VariantSelector,
} from './variantSelector.ts'
