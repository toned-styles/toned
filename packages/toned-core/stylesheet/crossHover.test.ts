import { describe, expect, test } from 'vitest'

import { resolveCrossHoverCss } from './crossHover.ts'

describe('resolveCrossHoverCss', () => {
  test('a trailing ~ on the source selects the SIBLING channel', () => {
    const out = resolveCrossHoverCss({
      source: {},
      target: {},
      'source~:hover': { target: { color: 'red' } },
    })
    expect(out.target[':sib-hover_color']).toBe('red')
    expect(out.source.className).toContain('_s')
    expect(out['source~:hover']).toBeUndefined()
  })

  test('the sibling channel carries declared states too', () => {
    const out = resolveCrossHoverCss(
      {
        source: {},
        target: {},
        'source~:data-active': { target: { color: 'blue' } },
      },
      { 'data-active': { selector: '[data-active]', relations: ['sibling'] } },
    )
    expect(out.target[':sib-data-active_color']).toBe('blue')
  })

  test('a declared state read through an undeclared relation names the declaration to add', () => {
    const rules = {
      source: {},
      target: {},
      'source~:open': { target: { color: 'blue' } },
    }
    expect(() =>
      resolveCrossHoverCss(rules, {
        open: { selector: "[data-state='open']", relations: ['ancestor'] },
      }),
    ).toThrow(
      `'source~:open' reads state "open" through its sibling channel, which the system does not declare. Declare it: states: { 'open': { selector: "[data-state='open']", relations: ['ancestor', 'sibling'] } }`,
    )
    expect(() =>
      resolveCrossHoverCss(
        { source: {}, target: {}, 'source:open': { target: { gap: 1 } } },
        { open: "[data-state='open']" },
      ),
    ).toThrow(/relations: \['ancestor'\]/)
  })

  test('source:focus-within is css-channelable (descendants only)', () => {
    const out = resolveCrossHoverCss({
      source: {},
      target: {},
      'source:focus-within': { target: { opacity: 1 } },
    })
    expect(out.target[':src-focus-within_opacity']).toBe(1)
    const sib = resolveCrossHoverCss({
      source: {},
      target: {},
      'source~:focus-within': { target: { opacity: 1 } },
    })
    // no sibling focus-within channel — left for the runtime path
    expect(sib['source~:focus-within']).toBeDefined()
  })

  test('rewrites a base-level source:hover into the src-hover channel', () => {
    const out = resolveCrossHoverCss({
      source: { bgColor: 'blue' },
      target: { color: 'black' },
      'source:hover': { target: { color: 'red' } },
    })
    expect(out.source.className).toBe('_s')
    expect(out.target[':src-hover_color']).toBe('red')
    expect(out['source:hover']).toBeUndefined()
  })

  test('rewrites a base-level source:<state> into the src-<state> channel', () => {
    const out = resolveCrossHoverCss(
      {
        trigger: { bgColor: 'blue' },
        chevron: { style: { rotate: '0deg' } },
        'trigger:open': { chevron: { style: { rotate: '180deg' } } },
      },
      {
        open: { selector: "[data-state='open']", relations: ['ancestor'] },
        closed: "[data-state='closed']",
      },
    )
    // source gains the _s marker; target property becomes a src-open chain key
    expect(out.trigger.className).toBe('_s')
    expect(out.chevron[':src-open_style']).toEqual({ rotate: '180deg' })
    expect(out['trigger:open']).toBeUndefined()
    // the resting chevron style is untouched
    expect(out.chevron.style).toEqual({ rotate: '0deg' })
  })

  test('leaves a state suffix alone when it is not a declared state', () => {
    const input = {
      trigger: {},
      chevron: {},
      'trigger:open': { chevron: { style: { rotate: '180deg' } } },
    }
    // no aliases declared → 'open' is not channelable, key is left as-is
    const out = resolveCrossHoverCss(input, {})
    expect(out['trigger:open']).toBeDefined()
    expect(out.chevron[':src-open_style']).toBeUndefined()
  })

  test('leaves runtime interaction pseudos (focus/active) alone', () => {
    const input = {
      source: {},
      target: {},
      'source:focus': { target: { color: 'red' } },
    }
    const out = resolveCrossHoverCss(input, { open: "[data-state='open']" })
    // :focus is a runtime pseudo, not a declared state — untouched
    expect(out['source:focus']).toBeDefined()
    expect(out.target[':src-focus_color']).toBeUndefined()
  })

  test('leaves compound state:pseudo cross keys to the runtime path', () => {
    const input = {
      source: {},
      target: {},
      'source:open:hover': { target: { color: 'red' } },
    }
    const out = resolveCrossHoverCss(input, { open: "[data-state='open']" })
    expect(out['source:open:hover']).toBeDefined()
  })

  test('a source that is both a hover and a state source keeps one _s marker per channel', () => {
    const out = resolveCrossHoverCss(
      {
        trigger: {},
        chevron: {},
        'trigger:hover': { chevron: { color: 'red' } },
        'trigger:open': { chevron: { style: { rotate: '180deg' } } },
      },
      { open: { selector: "[data-state='open']", relations: ['ancestor'] } },
    )
    // both channels rewrite; the source carries exactly ONE `_s` marker
    expect(out.trigger.className).toBe('_s')
    expect(out.chevron[':src-hover_color']).toBe('red')
    expect(out.chevron[':src-open_style']).toEqual({ rotate: '180deg' })
  })
})
