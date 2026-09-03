import { describe, expect, test } from 'vitest'

import { definePalette } from '../system/palette.ts'
import { generatePalette } from './palette.ts'

const palette = definePalette(
  {
    background: { light: '#fff', dark: '#0b0c10' },
    primary: { light: '#2f54eb', dark: '#7f96ff' },
    control: {
      light: 'transparent',
      dark: 'color-mix(in oklab, var(--input) 30%, transparent)',
    },
    // a bare string is theme-invariant
    radius: '12px',
    // a partial map falls back to the default theme where a key is missing
    ring: { dark: '#7f96ff' },
  },
  {
    themes: {
      light: { default: true, colorScheme: 'light' },
      dark: { colorScheme: 'dark' },
    },
  },
)

describe('definePalette', () => {
  test('requires exactly one default theme', () => {
    expect(() =>
      definePalette({}, { themes: { light: {}, dark: {} } }),
    ).toThrow(/exactly one theme must be \{ default: true \}/)
    expect(() =>
      definePalette(
        {},
        { themes: { light: { default: true }, dark: { default: true } } },
      ),
    ).toThrow(/exactly one/)
  })

  test('rejects a per-theme key that names an undeclared theme', () => {
    expect(() =>
      definePalette(
        { primary: { light: '#fff', dim: '#eee' } },
        { themes: { light: { default: true } } },
      ),
    ).toThrow(/names theme 'dim'/)
  })
})

describe('generatePalette', () => {
  test('the default theme lands on :root', () => {
    const css = generatePalette(palette)
    expect(css).toContain('--background: #fff;')
    expect(css).toContain('--primary: #2f54eb;')
    expect(css).toContain('--control: transparent;')
    expect(css.startsWith(':root {')).toBe(true)
  })

  test('a bare string is emitted identically in every scope', () => {
    const css = generatePalette(palette)
    // radius is invariant → the same value in :root and the dark scope
    const rootRadius = css.match(/:root \{[^}]*--radius: 12px;/)
    expect(rootRadius).not.toBeNull()
  })

  test('a non-default theme gets a manual scope (attribute + class)', () => {
    const css = generatePalette(palette)
    expect(css).toContain("[data-theme='dark'], .dark {")
    expect(css).toContain('--background: #0b0c10;')
  })

  test('a partial map falls back to the default theme value', () => {
    // `ring` has only a dark key → :root uses the default (dark) fallback
    const css = generatePalette(palette)
    // in the dark scope ring is its dark value; on :root it falls back to the
    // same (no light key), so both carry #7f96ff
    expect(css).toContain('--ring: #7f96ff;')
  })

  test('no media query by default; emitted when asked', () => {
    expect(generatePalette(palette)).not.toContain('@media')
    const withMedia = generatePalette(palette, { media: true })
    expect(withMedia).toContain('@media (prefers-color-scheme: dark) {')
    // guarded so a manual choice wins
    expect(withMedia).toContain(':root:not([data-theme]):not(.light) {')
  })
})
