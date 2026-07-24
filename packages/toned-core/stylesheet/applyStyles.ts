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

const prevStyleKeys = new WeakMap<object, Set<string>>()
const baselineValues = new WeakMap<object, Record<string, string>>()

export const setStyles = (curr: Ref | undefined, styleObject: RefStyle) => {
  if (!curr) return

  // React Native path - uses setNativeProps for direct style updates
  // Note: Could be abstracted to config.applyStyles for platform-specific handling
  if (curr.setNativeProps) {
    // Note: Currently replaces all styles; merging would require tracking previous toned styles
    curr.setNativeProps({ style: styleObject.style })
  } else {
    if (styleObject.style) {
      const result: Record<string, unknown> = {}

      // Restore stale properties to their pre-toned baseline instead of clearing
      const prev = prevStyleKeys.get(curr)
      const baselines = baselineValues.get(curr) || {}
      if (prev) {
        for (const key of prev) {
          if (!(key in styleObject.style)) {
            // Preserve CSS variable chains (for cssPseudoMode)
            const kebab = key.replace(/([A-Z])/g, '-$1').toLowerCase()
            const val: string = curr.style.getPropertyValue(kebab)
            if (val?.includes('var(--toned_')) continue
            result[key] = baselines[key] ?? ''
          }
        }
      }

      const currentKeys = new Set<string>()
      for (const key in styleObject.style) {
        // Snapshot pre-toned value before first modification of each key
        if (!(key in baselines)) {
          baselines[key] = curr.style[key] || ''
        }
        const v = styleObject.style[key]
        if (typeof v === 'number' && !unitlessNumbers.has(key)) {
          result[key] = `${v}px`
        } else {
          result[key] = v
        }
        currentKeys.add(key)
      }
      Object.assign(curr.style, result)
      prevStyleKeys.set(curr, currentKeys)
      baselineValues.set(curr, baselines)
    }
    if (styleObject.className) {
      // Note: This replaces all classNames; preserving non-toned classes would require
      // tracking which classes were added by toned vs external sources
      curr.className = styleObject.className
    }
  }
}
