import { describe, expect, test } from 'vitest'
import { camelToKebab, withCssUnit } from './css.ts'

describe('camelToKebab', () => {
  test('hyphenates at each capital', () => {
    expect(camelToKebab('backgroundColor')).toBe('background-color')
    expect(camelToKebab('paddingInlineStart')).toBe('padding-inline-start')
  })

  test('lowercases a leading vendor capital', () => {
    expect(camelToKebab('WebkitTransform')).toBe('-webkit-transform')
  })

  test('leaves an already-flat name alone', () => {
    expect(camelToKebab('padding')).toBe('padding')
  })

  test('splits a name containing digits', () => {
    expect(camelToKebab('grid2Column')).toBe('grid2-column')
  })
})

describe('withCssUnit', () => {
  // Style maps are shared between web and React Native, so a length is written
  // as a bare number. `8` on its own is not a valid CSS length, so whoever
  // turns the value into CSS text has to add the unit.

  test('adds px to a number on a length property', () => {
    expect(withCssUnit('padding', 8)).toBe('8px')
    expect(withCssUnit('marginTop', -4)).toBe('-4px')
    expect(withCssUnit('width', 100)).toBe('100px')
  })

  test('adds px to zero, so the output is always a valid length', () => {
    expect(withCssUnit('padding', 0)).toBe('0px')
  })

  test('adds px to a fractional value', () => {
    expect(withCssUnit('borderWidth', 0.5)).toBe('0.5px')
  })

  test('leaves numbers on unitless properties alone', () => {
    expect(withCssUnit('opacity', 0.5)).toBe(0.5)
    expect(withCssUnit('flexGrow', 1)).toBe(1)
    expect(withCssUnit('zIndex', 10)).toBe(10)
    expect(withCssUnit('lineHeight', 1.5)).toBe(1.5)
    expect(withCssUnit('fontWeight', 700)).toBe(700)
  })

  test('matches on the camelCase property name, as style maps are keyed', () => {
    // 'flex-grow' is not how a style map spells it, so it is not recognised —
    // callers must pass the camelCase key they hold.
    expect(withCssUnit('flexGrow', 1)).toBe(1)
    expect(withCssUnit('flex-grow', 1)).toBe('1px')
  })

  test('passes strings through, whatever they contain', () => {
    expect(withCssUnit('padding', '8px')).toBe('8px')
    expect(withCssUnit('padding', '1rem')).toBe('1rem')
    expect(withCssUnit('padding', 'auto')).toBe('auto')
    expect(withCssUnit('padding', 'calc(var(--base) * 2)')).toBe(
      'calc(var(--base) * 2)',
    )
    expect(withCssUnit('padding', 'var(--media-md__padding, 4px)')).toBe(
      'var(--media-md__padding, 4px)',
    )
  })

  test('passes non-numeric values through untouched', () => {
    expect(withCssUnit('padding', null)).toBeNull()
    expect(withCssUnit('padding', undefined)).toBeUndefined()
    expect(withCssUnit('padding', '')).toBe('')
  })

  test('does not treat a numeric string as a number', () => {
    // Only real numbers carry the implicit unit; a string is already CSS text.
    expect(withCssUnit('padding', '8')).toBe('8')
  })
})
