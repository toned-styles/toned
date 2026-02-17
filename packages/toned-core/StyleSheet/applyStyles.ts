/**
 * DOM/RN style application utilities.
 *
 * @module stylesheet/applyStyles
 */

import { unitlessNumbers } from './unitlessNumbers.ts'

// biome-ignore lint/suspicious/noExplicitAny: internal type alias for dynamic stylesheet values
type AnyValue = any

type Ref = AnyValue
type RefStyle = AnyValue

export const setStyles = (curr: Ref | undefined, styleObject: RefStyle) => {
  if (!curr) return

  // React Native path - uses setNativeProps for direct style updates
  // Note: Could be abstracted to config.applyStyles for platform-specific handling
  if (curr.setNativeProps) {
    // Note: Currently replaces all styles; merging would require tracking previous toned styles
    curr.setNativeProps({ style: styleObject.style })
  } else {
    if (styleObject.style) {
      // can't remove style completely as element might styles from other sources
      // curr.removeAttribute('style');
      const result: Record<string, unknown> = {}

      for (const key in styleObject.style) {
        const v = styleObject.style[key]
        if (typeof v === 'number' && !unitlessNumbers.has(key)) {
          result[key] = `${v}px`
        } else {
          result[key] = v
        }
      }
      Object.assign(curr.style, result)
    }
    if (styleObject.className) {
      // Note: This replaces all classNames; preserving non-toned classes would require
      // tracking which classes were added by toned vs external sources
      curr.className = styleObject.className
    }
  }
}
