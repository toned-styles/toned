/** The alpha modifier — parsing, CSS emission, exec resolution, literals. */
import { describe, expect, test } from 'vitest'
import { generate } from '../dom/generate.ts'
import { defineSystem, defineToken } from '../system/index.ts'
import { alphaLiteral, splitAlphaValue } from './alpha.ts'

const bgColor = defineToken({
  values: ['primary', 'card', 'transparent'] as const,
  resolve: (value, tokens) => ({
    backgroundColor: value === 'transparent' ? 'transparent' : tokens[value],
  }),
  alphaChannel: ['backgroundColor'],
  alphaSteps: [30, 50, 90],
})

// No alphaChannel — must behave exactly as before.
const textColor = defineToken({
  values: ['foreground'] as const,
  resolve: (value, tokens) => ({ color: tokens[value] }),
})

const system = defineSystem({ bgColor, textColor })

const exec = (style: Record<string, unknown>, useClassName: boolean) =>
  system.exec(
    {
      tokens: new Proxy({}, { get: (_t, p: string) => `var(--${p})` }),
      useClassName,
    },
    // biome-ignore lint/suspicious/noExplicitAny: test drives the open surface
    style as any,
  )

describe('splitAlphaValue', () => {
  test('parses value/step', () => {
    expect(splitAlphaValue('primary/90')).toEqual({ base: 'primary', alpha: 90 })
    expect(splitAlphaValue('danger-surface/12.5')).toEqual({
      base: 'danger-surface',
      alpha: 12.5,
    })
  })

  test('rejects malformed values', () => {
    expect(splitAlphaValue('primary')).toBeNull()
    expect(splitAlphaValue('primary/')).toBeNull()
    expect(splitAlphaValue('/90')).toBeNull()
    expect(splitAlphaValue('primary/0')).toBeNull()
    expect(splitAlphaValue('primary/100')).toBeNull()
    expect(splitAlphaValue('primary/abc')).toBeNull()
    expect(splitAlphaValue(4)).toBeNull()
  })
})

describe('generated CSS', () => {
  const css = generate(system.system)

  test('alpha-capable colour rules route through relative colour syntax', () => {
    expect(css).toContain(
      '.bgColor_primary{background-color:rgb(from var(--primary) r g b / var(--toned-alpha-background-color, 1));}',
    )
  })

  test('unwrappable values stay literal', () => {
    expect(css).toContain('.bgColor_transparent{background-color:transparent;}')
  })

  test('tokens without an alphaChannel are untouched', () => {
    expect(css).toContain('.textColor_foreground{color:var(--foreground);}')
  })

  test('registers a non-inheriting parameter per channel', () => {
    expect(css).toContain(
      "@property --toned-alpha-background-color {syntax:'<number>';inherits:false;initial-value:1;}",
    )
  })

  test('emits one class per declared step, escaped', () => {
    expect(css).toContain('.bgColor\\$50{--toned-alpha-background-color:0.5}')
    expect(css).toContain('.bgColor\\$90{--toned-alpha-background-color:0.9}')
  })
})

describe('exec, className mode', () => {
  test('an enumerated step resolves to base class + step class', () => {
    const out = exec({ bgColor: 'primary/50' }, true)
    expect(out.className).toContain('bgColor_primary')
    expect(out.className).toContain('bgColor$50')
    expect(out.style).toEqual({})
  })

  test('an off-scale alpha resolves to base class + inline parameter', () => {
    const out = exec({ bgColor: 'primary/42' }, true)
    expect(out.className).toContain('bgColor_primary')
    expect(out.className).not.toContain('$42')
    expect(out.style['--toned-alpha-background-color']).toBe('0.42')
  })

  test('a plain value is untouched', () => {
    const out = exec({ bgColor: 'primary' }, true)
    expect(out.className).toContain('bgColor_primary')
    expect(out.className).not.toContain('$')
  })
})

describe('exec, inline mode (native/email path)', () => {
  test('var() references route through relative colour syntax', () => {
    const out = exec({ bgColor: 'primary/50' }, false)
    expect(out.style.backgroundColor).toBe('rgb(from var(--primary) r g b / 0.5)')
  })

  test('literal tokens compute an rgba', () => {
    const literalTokens = { primary: '#2f54eb' }
    const out = system.exec(
      { tokens: literalTokens, useClassName: false },
      // biome-ignore lint/suspicious/noExplicitAny: test drives the open surface
      { bgColor: 'primary/50' } as any,
    )
    expect(out.style.backgroundColor).toBe('rgba(47, 84, 235, 0.5)')
  })
})

describe('alphaLiteral', () => {
  test('hex forms', () => {
    expect(alphaLiteral('#fff', 0.5)).toBe('rgba(255, 255, 255, 0.5)')
    expect(alphaLiteral('#2f54eb', 0.9)).toBe('rgba(47, 84, 235, 0.9)')
    expect(alphaLiteral('#2f54eb80', 0.5)).toBe('rgba(47, 84, 235, 0.251)')
  })

  test('rgb()/rgba() forms compose alphas', () => {
    expect(alphaLiteral('rgb(20 20 28)', 0.3)).toBe('rgba(20, 20, 28, 0.3)')
    expect(alphaLiteral('rgb(20 20 28 / 0.5)', 0.5)).toBe('rgba(20, 20, 28, 0.25)')
  })
})
