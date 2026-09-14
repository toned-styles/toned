import { describe, expect, test } from 'vitest'
import { setStyles } from './applyStyles.ts'

// Minimal stand-in for an element's inline style. Mirrors a browser closely
// enough for setStyles' web branch: toned writes camelCase properties via
// direct assignment and reads them back with getPropertyValue(kebab). No value
// normalization, so reads return exactly what was written.
//
// Custom properties are held separately, because CSSOM does not expose them as
// IDL attributes: only setProperty registers one, and '' removes it. Assigning
// `style['--x']` lands as an expando that never reaches the CSS.
type FakeStyle = {
  getPropertyValue(prop: string): string
  setProperty(prop: string, value: string): void
} & Record<string, unknown>
type FakeEl = { style: FakeStyle }

function makeEl(): FakeEl {
  const kebabToCamel = (prop: string) =>
    prop.replace(/-([a-z])/g, (_, c: string) => c.toUpperCase())

  const custom: Record<string, string> = {}

  const style = {
    getPropertyValue(prop: string): string {
      if (prop.startsWith('--')) return custom[prop] ?? ''
      const v = style[kebabToCamel(prop)]
      return v == null ? '' : String(v)
    },
    setProperty(prop: string, value: string): void {
      if (prop.startsWith('--')) {
        if (value === '') delete custom[prop]
        else custom[prop] = value
        return
      }
      style[kebabToCamel(prop)] = value
    },
  } as FakeStyle
  // No setNativeProps → setStyles takes the web (DOM) branch.
  return { style }
}

const cssValue = (el: FakeEl, prop: string) => el.style.getPropertyValue(prop)

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
    el.style.setProperty('color', 'green')

    // toned drops `color`. Because the live value is no longer what toned wrote,
    // it must leave the foreign value untouched instead of restoring baseline.
    setStyles(el, { style: { opacity: 1 } })

    expect(cssValue(el, 'color')).toBe('green')
  })

  test('refreshes the baseline to a foreign value, then restores it on drop', () => {
    const el = makeEl()
    setStyles(el, { style: { color: 'red' } })

    // External write, then toned writes the property again — baseline refreshes.
    el.style.setProperty('color', 'green')
    setStyles(el, { style: { color: 'blue' } })

    // Now toned drops it: the restored baseline is the foreign value, not the
    // original pre-toned empty string.
    setStyles(el, { style: { opacity: 1 } })

    expect(cssValue(el, 'color')).toBe('green')
  })

  test('restores the pre-toned baseline when toned still owns the property', () => {
    const el = makeEl()
    // Pre-existing, non-toned inline value.
    el.style.setProperty('color', 'rebeccapurple')

    setStyles(el, { style: { color: 'red' } })
    expect(cssValue(el, 'color')).toBe('red')

    // Drop it while toned still owns it → the original value comes back.
    setStyles(el, { style: { opacity: 1 } })
    expect(cssValue(el, 'color')).toBe('rebeccapurple')
  })
})

describe('setStyles (web) custom properties', () => {
  // The var() chains exec emits are only worth anything if their toggle
  // declarations reach the CSS, which takes setProperty.

  test('writes a toggle declaration alongside the chain that reads it', () => {
    const el = makeEl()

    setStyles(el, {
      style: {
        '--media-md__padding': 'var(--media-md) 16px',
        padding: 'var(--media-md__padding, 4px)',
      },
    })

    expect(cssValue(el, '--media-md__padding')).toBe('var(--media-md) 16px')
    expect(cssValue(el, 'padding')).toBe('var(--media-md__padding, 4px)')
  })

  test('clears a custom property toned no longer writes', () => {
    const el = makeEl()

    setStyles(el, { style: { '--media-md__padding': 'var(--media-md) 16px' } })
    expect(cssValue(el, '--media-md__padding')).toBe('var(--media-md) 16px')

    setStyles(el, { style: { color: 'red' } })
    expect(cssValue(el, '--media-md__padding')).toBe('')
  })

  test('leaves a numeric custom property unitless', () => {
    const el = makeEl()

    // A custom property holds arbitrary text, so the implicit px a length
    // carries in a style map must not be applied to it.
    setStyles(el, { style: { '--gap': 8, paddingTop: 8 } })

    expect(cssValue(el, '--gap')).toBe('8')
    expect(cssValue(el, 'padding-top')).toBe('8px')
  })

  test('preserves case in a custom property name', () => {
    const el = makeEl()

    // Custom property names are case-sensitive, so kebab-casing '--myGap'
    // would write (and read back) a name nobody declared.
    setStyles(el, { style: { '--myGap': '4px' } })

    expect(cssValue(el, '--myGap')).toBe('4px')
    expect(cssValue(el, '--my-gap')).toBe('')
  })
})
