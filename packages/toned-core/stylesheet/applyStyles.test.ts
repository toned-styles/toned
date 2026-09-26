import { describe, expect, test } from 'vitest'
import { registerFixtureHost } from '../testing/native-host.test.fixture.ts'
import { recordHostCommit, setStyles } from './applyStyles.ts'

// Minimal stand-in for an element's inline style. Mirrors a browser closely
// enough for setStyles' web branch: toned writes camelCase properties via
// Object.assign and reads them back with getPropertyValue(kebab). No value
// normalization, so reads return exactly what was written.
type FakeStyle = {
  getPropertyValue(prop: string): string
  setProperty(prop: string, value: string): void
} & Record<string, unknown>
type FakeEl = { style: FakeStyle }

function makeEl(): FakeEl {
  const kebabToCamel = (prop: string) =>
    prop.startsWith('--')
      ? prop
      : prop.replace(/-([a-z])/g, (_, c: string) => c.toUpperCase())

  const style = {
    getPropertyValue(prop: string): string {
      const v = style[kebabToCamel(prop)]
      return v == null ? '' : String(v)
    },
    // Stand-in for a non-toned source writing an inline property.
    setProperty(prop: string, value: string): void {
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

describe('setStyles (web) className ownership', () => {
  // makeEl plus the classList surface setStyles' className branch uses.
  function makeClassEl(initial: string) {
    const el = makeEl() as FakeEl & {
      className: string
      classList: {
        add(cls: string): void
        remove(cls: string): void
        contains(cls: string): boolean
      }
    }
    el.className = initial
    el.classList = {
      contains(cls: string) {
        return el.className.split(/\s+/).includes(cls)
      },
      add(cls: string) {
        const parts = el.className.split(' ').filter(Boolean)
        if (!parts.includes(cls)) parts.push(cls)
        el.className = parts.join(' ')
      },
      remove(cls: string) {
        el.className = el.className
          .split(' ')
          .filter((c) => c && c !== cls)
          .join(' ')
      },
    }
    return el
  }

  test('null className clears owned classes and mutable requests are re-read', () => {
    const el = makeClassEl('foreign')
    const request = {
      style: { opacity: 0.5 },
      className: 'owned' as string | null,
    }
    setStyles(el, request)
    request.className = null
    request.style.opacity = 0.75
    setStyles(el, request)
    expect(el.className).toBe('foreign')
    expect(cssValue(el, 'opacity')).toBe('0.75')
    recordHostCommit(el, request, { className: null })
    setStyles(el, { className: null })
    expect(el.className).toBe('foreign')
  })

  test('swaps only toned-written classes, preserving foreign ones', () => {
    // The host framework rendered marker + caller classes merged with toned's.
    const el = makeClassEl('tnd-marker caller-utility _ width_8')

    setStyles(el, { style: {}, className: '_ width_8' })
    expect(el.className).toBe('tnd-marker caller-utility _ width_8')

    // A later match writes a different toned set (the style-only-diff case the
    // host framework never repairs): toned removes only its own stale classes.
    setStyles(el, { style: {}, className: '_ width_12' })
    const classes = el.className.split(' ')
    expect(classes).toContain('tnd-marker')
    expect(classes).toContain('caller-utility')
    expect(classes).toContain('width_12')
    expect(classes).not.toContain('width_8')
    setStyles(el, {})
    expect(el.className.split(' ')).toEqual(['tnd-marker', 'caller-utility'])
  })
})

describe('native owned patches', () => {
  test('restores caller baseline, resets dropped keys, and skips identical patches', () => {
    const patches: unknown[] = []
    const host = { setNativeProps: (patch: unknown) => patches.push(patch) }
    registerFixtureHost(host)
    recordHostCommit(
      host,
      { style: { opacity: 1, width: 10 } },
      { style: { color: 'blue' } },
    )
    setStyles(host, { style: { opacity: 0, width: 10 } })
    setStyles(host, { style: { opacity: 0, width: 10 } })
    setStyles(host, {})
    expect(patches).toEqual([
      { style: { opacity: 0 } },
      { style: { opacity: null, width: null } },
    ])
  })
})

test('native bridge props are diffed and restore a caller baseline on removal', () => {
  const patches: unknown[] = []
  const host = { setNativeProps: (patch: unknown) => patches.push(patch) }
  registerFixtureHost(host)
  recordHostCommit(
    host,
    { style: {}, selectionColor: 'red', placeholderTextColor: 'red' },
    { selectionColor: 'blue' },
  )
  setStyles(host, {
    style: {},
    selectionColor: 'green',
    placeholderTextColor: 'green',
  })
  setStyles(host, {})
  expect(patches).toEqual([
    { placeholderTextColor: 'green' },
    { placeholderTextColor: null },
  ])
})

test('a commit keeps ownership of event-only fields React did not rewrite', () => {
  const base = makeEl()
  const classes = new Set(['base', 'caller'])
  const host = {
    ...base,
    classList: {
      contains: (name: string) => classes.has(name),
      add: (name: string) => {
        classes.add(name)
      },
      remove: (name: string) => {
        classes.delete(name)
      },
    },
  }
  base.style.setProperty('opacity', '1')
  recordHostCommit(
    host,
    { style: { opacity: 1 }, className: 'base' },
    { className: 'caller' },
  )
  setStyles(host, { style: { opacity: 0, color: 'red' }, className: 'hover' })
  // The declarative style/class props are unchanged from React's point of
  // view, so React does not write them again during this unrelated commit.
  recordHostCommit(
    host,
    { style: { opacity: 1 }, className: 'base' },
    { className: 'caller' },
  )
  setStyles(host, { style: { opacity: 1 }, className: 'base' })
  expect(cssValue(base, 'opacity')).toBe('1')
  expect(cssValue(base, 'color')).toBe('')
  expect([...classes].sort()).toEqual(['base', 'caller'])
})
