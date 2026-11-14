import { describe, expect, test } from 'vitest'

import { formatColor, mixColor, parseColor } from './color.ts'

describe('motion colours', () => {
  test('parses the colour literals a committed output carries', () => {
    expect(formatColor(parseColor('#fff')!)).toBe('rgba(255, 255, 255, 1)')
    expect(formatColor(parseColor('#2563eb80')!)).toBe(
      'rgba(37, 99, 235, 0.502)',
    )
    expect(formatColor(parseColor('rgb(37, 99, 235)')!)).toBe(
      'rgba(37, 99, 235, 1)',
    )
    expect(formatColor(parseColor('rgb(37 99 235 / 50%)')!)).toBe(
      'rgba(37, 99, 235, 0.5)',
    )
    expect(formatColor(parseColor('hsl(0 100% 50%)')!)).toBe(
      'rgba(255, 0, 0, 1)',
    )
    expect(formatColor(parseColor('oklch(1 0 0)')!)).toBe(
      'rgba(255, 255, 255, 1)',
    )
    expect(formatColor(parseColor('transparent')!)).toBe('rgba(0, 0, 0, 0)')
    expect(parseColor('var(--x)')).toBeUndefined()
    expect(parseColor('papayawhip')).toBeUndefined()
  })
  test('interpolates in oklab, not in sRGB', () => {
    const black = parseColor('#000')!
    const white = parseColor('#fff')!
    // Oklab lightness 0.5 is sRGB 99, where an sRGB mix would give 128.
    expect(formatColor(mixColor(black, white, 0.5))).toBe('rgba(99, 99, 99, 1)')
    expect(formatColor(mixColor(black, white, 0))).toBe('rgba(0, 0, 0, 1)')
    expect(formatColor(mixColor(black, white, 1))).toBe(
      'rgba(255, 255, 255, 1)',
    )
  })
  test('a fade to transparent keeps its hue (premultiplied alpha)', () => {
    const blue = parseColor('#2563eb')!
    const clear = parseColor('transparent')!
    expect(formatColor(mixColor(blue, clear, 0.5))).toBe(
      'rgba(37, 99, 235, 0.5)',
    )
  })
})
