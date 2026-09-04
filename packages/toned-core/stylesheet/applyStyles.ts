/**
 * DOM/RN style application utilities.
 *
 * @module stylesheet/applyStyles
 */

import { camelToKebab } from '../utils/css.ts'
import { unitlessNumbers } from './unitlessNumbers.ts'

// biome-ignore lint/suspicious/noExplicitAny: internal type alias for dynamic stylesheet values
type AnyValue = any

type Ref = AnyValue
type RefStyle = AnyValue

const prevStyleKeys = new WeakMap<object, Set<string>>()
// Pre-toned value of each property: captured before toned's first write and
// refreshed whenever a non-toned source changes it. Restored when toned drops
// the property.
const baselineValues = new WeakMap<object, Record<string, string>>()
// The value toned last wrote for each property, read back from the DOM so
// ownership checks compare against the browser's normalized form. Lets us tell
// "toned still owns this property" from "another source has since changed it".
const lastWrittenValues = new WeakMap<object, Record<string, string>>()

export const setStyles = (curr: Ref | undefined, styleObject: RefStyle) => {
  if (!curr) return

  // An element with neither branch's API cannot be styled; returning beats
  // the TypeError the baseline reads below would otherwise throw on it.
  if (!curr.setNativeProps && !curr.style) return

  // React Native path - uses setNativeProps for direct style updates
  // Note: Could be abstracted to config.applyStyles for platform-specific handling
  if (curr.setNativeProps) {
    // Note: Currently replaces all styles; merging would require tracking previous toned styles
    curr.setNativeProps({ style: styleObject.style })
  } else {
    if (styleObject.style) {
      const result: Record<string, unknown> = {}

      const prev = prevStyleKeys.get(curr)
      const baselines = baselineValues.get(curr) || {}
      const lastWritten = lastWrittenValues.get(curr) || {}

      // Restore properties toned wrote last time but isn't writing now.
      if (prev) {
        for (const key of prev) {
          if (key in styleObject.style) continue
          const live: string = curr.style.getPropertyValue(camelToKebab(key))
          // If the live value isn't what toned last wrote, another source now
          // owns this property — leave it untouched rather than clobber it.
          if (key in lastWritten && live !== lastWritten[key]) continue
          // Otherwise toned still owns it, so restore the pre-toned baseline.
          // This also clears a now-stale `var(--toned_*)` chain on drop.
          result[key] = baselines[key] ?? ''
          delete lastWritten[key]
        }
      }

      const currentKeys = new Set<string>()
      for (const key in styleObject.style) {
        // Capture the pre-toned baseline on first sight, and refresh it if a
        // non-toned source has changed the live value since toned last wrote.
        if (!(key in baselines)) {
          baselines[key] = curr.style.getPropertyValue(camelToKebab(key))
        } else if (key in lastWritten) {
          const live = curr.style.getPropertyValue(camelToKebab(key))
          if (live !== lastWritten[key]) baselines[key] = live
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

      // Record what toned actually wrote (read back so later comparisons use the
      // DOM's normalized form) to detect future foreign writes.
      for (const key of currentKeys) {
        lastWritten[key] = curr.style.getPropertyValue(camelToKebab(key))
      }

      prevStyleKeys.set(curr, currentKeys)
      baselineValues.set(curr, baselines)
      lastWrittenValues.set(curr, lastWritten)
    }
    if (styleObject.className) {
      // Note: This replaces all classNames; preserving non-toned classes would require
      // tracking which classes were added by toned vs external sources
      curr.className = styleObject.className
    }
  }
}
