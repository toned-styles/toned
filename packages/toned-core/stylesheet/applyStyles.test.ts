import { describe, expect, test } from 'vitest'
import { setStyles } from './applyStyles.ts'

// Minimal stand-in for an element's inline style. Mirrors a browser closely
// enough for setStyles' web branch: toned writes camelCase properties via
// Object.assign and reads them back with getPropertyValue(kebab). No value
// normalization, so reads return exactly what was written.
function makeEl() {
  const kebabToCamel = (prop: string) =>
    prop.startsWith('--')
      ? prop
      : prop.replace(/-([a-z])/g, (_, c: string) => c.toUpperCase())

  const style: Record<string, unknown> = {
    getPropertyValue(prop: string) {
      const v = style[kebabToCamel(prop)]
      return v == null ? '' : String(v)
    },
  }
  // No setNativeProps → setStyles takes the web (DOM) branch.
  return { style }
}

const cssValue = (el: { style: Record<string, unknown> }, prop: string) =>
  (el.style.getPropertyValue as (p: string) => string)(prop)

describe('setStyles (web) baseline restore', () => {
  test('applies resolved styles and appends px to unitless-exempt numbers', () => {
    const el = makeEl()
    setStyles(el, { style: { color: 'red', paddingTop: 4, opacity: 0.5 } })

    expect(cssValue(el, 'color')).toBe('red')
    expect(cssValue(el, 'padding-top')).toBe('4px')
    expect(cssValue(el, 'opacity')).toBe('0.5')
  })

  test('clears a dropped property (including a stale var(--toned_*) chain)', () => {
    const el = makeEl()

    // toned drives an interaction as an inline var chain.
    setStyles(el, { style: { cursor: 'var(--toned_hover__cursor, pointer)' } })
    expect(cssValue(el, 'cursor')).toBe('var(--toned_hover__cursor, pointer)')

    // A variant change drops `cursor`. The old code `continue`d on any
    // var(--toned_ value and left the chain behind; it must now be cleared.
    setStyles(el, { style: { color: 'red' } })

    expect(cssValue(el, 'cursor')).toBe('')
    expect(cssValue(el, 'color')).toBe('red')
  })

  test('does not clobber a value a non-toned source wrote after toned', () => {
    const el = makeEl()
    setStyles(el, { style: { color: 'red' } })

    // An external source takes over the inline `color`.
    el.style.color = 'green'

    // toned drops `color`. Because the live value is no longer what toned wrote,
    // it must leave the foreign value untouched instead of restoring baseline.
    setStyles(el, { style: { opacity: 1 } })

    expect(cssValue(el, 'color')).toBe('green')
  })

  test('refreshes the baseline to a foreign value, then restores it on drop', () => {
    const el = makeEl()
    setStyles(el, { style: { color: 'red' } })

    // External write, then toned writes the property again — baseline refreshes.
    el.style.color = 'green'
    setStyles(el, { style: { color: 'blue' } })

    // Now toned drops it: the restored baseline is the foreign value, not the
    // original pre-toned empty string.
    setStyles(el, { style: { opacity: 1 } })

    expect(cssValue(el, 'color')).toBe('green')
  })

  test('restores the pre-toned baseline when toned still owns the property', () => {
    const el = makeEl()
    // Pre-existing, non-toned inline value.
    el.style.color = 'rebeccapurple'

    setStyles(el, { style: { color: 'red' } })
    expect(cssValue(el, 'color')).toBe('red')

    // Drop it while toned still owns it → the original value comes back.
    setStyles(el, { style: { opacity: 1 } })
    expect(cssValue(el, 'color')).toBe('rebeccapurple')
  })
})
