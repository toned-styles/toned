import { describe, expect, test } from 'vitest'
import { defineSystem, defineToken, defineUnit } from './definers.ts'

// biome-ignore lint/suspicious/noExplicitAny: test helper for dynamic style access
type AnyStyle = Record<string, any>

describe('defineToken', () => {
  test('returns config unchanged (passthrough)', () => {
    const config = {
      values: ['primary', 'secondary'] as const,
      resolve: (v: 'primary' | 'secondary') => ({
        backgroundColor: v === 'primary' ? '#007bff' : '#6c757d',
      }),
    }

    const result = defineToken(config)
    expect(result).toBe(config)
  })
})

describe('defineUnit', () => {
  test('returns resolver unchanged (passthrough)', () => {
    const resolver = (value: number) => value * 4

    const result = defineUnit(resolver)
    expect(result).toBe(resolver)
  })
})

describe('defineSystem', () => {
  const bgColor = defineToken({
    values: ['primary', 'secondary'] as const,
    resolve: (v) => ({
      backgroundColor: v === 'primary' ? '#007bff' : '#6c757d',
    }),
  })

  const textColor = defineToken({
    values: ['white', 'black'] as const,
    resolve: (v) => ({
      color: v === 'white' ? '#fff' : '#000',
    }),
  })

  test('returns object with system, t, stylesheet, exec, and config properties', () => {
    const result = defineSystem({ bgColor, textColor })

    expect(result).toHaveProperty('system')
    expect(result).toHaveProperty('t')
    expect(result).toHaveProperty('stylesheet')
    expect(result).toHaveProperty('exec')
    expect(result).toHaveProperty('config')

    expect(typeof result.t).toBe('function')
    expect(typeof result.stylesheet).toBe('function')
    expect(typeof result.exec).toBe('function')
  })

  test('system contains the token definitions', () => {
    const result = defineSystem({ bgColor, textColor })

    expect(result.system.bgColor).toBe(bgColor)
    expect(result.system.textColor).toBe(textColor)
  })

  test('config is undefined when no config is provided', () => {
    const result = defineSystem({ bgColor })

    expect(result.config).toBeUndefined()
  })

  test('config contains breakpoints when provided', () => {
    const result = defineSystem(
      { bgColor },
      { breakpoints: { __breakpoints: { sm: 640, md: 768 } } },
    )

    expect(result.config).toEqual({
      breakpoints: { __breakpoints: { sm: 640, md: 768 } },
    })
  })

  describe('exec() basic token resolution', () => {
    test('resolves token values through token configs', () => {
      const { exec } = defineSystem({ bgColor, textColor })

      const result = exec(
        { tokens: {}, useClassName: false },
        { bgColor: 'primary', textColor: 'black' },
      )

      expect(result.style).toEqual({
        backgroundColor: '#007bff',
        color: '#000',
      })
    })

    test('resolves a single token', () => {
      const { exec } = defineSystem({ bgColor })

      const result = exec(
        { tokens: {}, useClassName: false },
        { bgColor: 'secondary' },
      )

      expect(result.style).toEqual({
        backgroundColor: '#6c757d',
      })
    })
  })

  describe('exec() with className mode', () => {
    test('generates className strings for known token values', () => {
      const { exec } = defineSystem({ bgColor, textColor })

      const result = exec(
        { tokens: {}, useClassName: true },
        { bgColor: 'primary', textColor: 'white' },
      )

      expect(result.className).toContain('bgColor_primary')
      expect(result.className).toContain('textColor_white')
      // In className mode, known values should not appear in style
      expect(result.style).toEqual({})
    })

    test('falls back to style resolution for unknown values when useClassName is false', () => {
      const { exec } = defineSystem({ bgColor })

      const result = exec(
        { tokens: {}, useClassName: false },
        { bgColor: 'primary' },
      )

      expect(result.style).toEqual({ backgroundColor: '#007bff' })
    })
  })

  describe('exec() with style pass-through', () => {
    test('passes raw style objects through', () => {
      const { exec } = defineSystem({ bgColor })

      const result = exec({ tokens: {}, useClassName: false }, {
        style: { opacity: 0.5, zIndex: 10 },
      } as any)

      expect(result.style).toEqual({ opacity: 0.5, zIndex: 10 })
    })

    test('merges style with resolved tokens', () => {
      const { exec } = defineSystem({ bgColor })

      const result = exec({ tokens: {}, useClassName: false }, {
        bgColor: 'primary',
        style: { opacity: 0.5 },
      } as any)

      expect(result.style).toEqual({
        backgroundColor: '#007bff',
        opacity: 0.5,
      })
    })
  })

  describe('exec() with className pass-through', () => {
    test('appends className strings', () => {
      const { exec } = defineSystem({ bgColor })

      const result = exec({ tokens: {}, useClassName: false }, {
        className: 'custom-class',
      } as any)

      expect(result.className).toContain('custom-class')
    })

    test('combines token classNames with custom className', () => {
      const { exec } = defineSystem({ bgColor })

      const result = exec({ tokens: {}, useClassName: true }, {
        bgColor: 'primary',
        className: 'extra',
      } as any)

      expect(result.className).toContain('bgColor_primary')
      expect(result.className).toContain('extra')
    })
  })

  describe('exec() skips pseudo/$ keys', () => {
    test('keys starting with : are ignored', () => {
      const { exec } = defineSystem({ bgColor })

      const result = exec({ tokens: {}, useClassName: false }, {
        ':hover': { bgColor: 'secondary' },
        bgColor: 'primary',
      } as any)

      expect(result.style).toEqual({ backgroundColor: '#007bff' })
    })

    test('keys starting with $ are ignored', () => {
      const { exec } = defineSystem({ bgColor })

      const result = exec({ tokens: {}, useClassName: false }, {
        $variant: 'large',
        bgColor: 'primary',
      } as any)

      expect(result.style).toEqual({ backgroundColor: '#007bff' })
    })

    test('both : and $ keys are ignored simultaneously', () => {
      const { exec } = defineSystem({ bgColor })

      const result = exec({ tokens: {}, useClassName: false }, {
        ':focus': { bgColor: 'secondary' },
        $size: 'lg',
        bgColor: 'primary',
      } as any)

      expect(result.style).toEqual({ backgroundColor: '#007bff' })
    })
  })

  describe('exec() skips falsy values', () => {
    test('undefined values are skipped', () => {
      const { exec } = defineSystem({ bgColor, textColor })

      const result = exec({ tokens: {}, useClassName: false }, {
        bgColor: 'primary',
        textColor: undefined,
      } as any)

      expect(result.style).toEqual({ backgroundColor: '#007bff' })
    })
  })

  describe('exec() CSS variable mode output', () => {
    test('generates CSS variable fallback chains for breakpoint overrides', () => {
      const { exec } = defineSystem(
        {
          bgColor: defineToken({
            values: ['primary', 'secondary'] as const,
            resolve: (v) => ({
              backgroundColor: v === 'primary' ? '#007bff' : '#6c757d',
            }),
          }),
        },
        {
          breakpoints: { __breakpoints: { sm: 640, md: 768 } },
        },
      )

      const result = exec({ tokens: {}, useClassName: false }, {
        bgColor: 'primary',
        '@sm_bgColor': 'secondary',
      } as any)

      // Should have the CSS custom property for the sm breakpoint
      expect(result.style).toHaveProperty('--media-sm__background-color')
      expect((result.style as AnyStyle)['--media-sm__background-color']).toBe(
        'var(--media-sm) #6c757d',
      )

      // The main property should be wrapped in a var() fallback chain
      expect((result.style as AnyStyle)['backgroundColor']).toBe(
        'var(--media-sm__background-color, #007bff)',
      )
    })

    test('generates fallback chains for multiple breakpoints sorted by size', () => {
      const { exec } = defineSystem(
        {
          bgColor: defineToken({
            values: ['primary', 'secondary', 'danger'] as const,
            resolve: (v) => ({
              backgroundColor:
                v === 'primary'
                  ? '#007bff'
                  : v === 'secondary'
                    ? '#6c757d'
                    : '#dc3545',
            }),
          }),
        },
        {
          breakpoints: { __breakpoints: { sm: 640, md: 768 } },
        },
      )

      const result = exec({ tokens: {}, useClassName: false }, {
        bgColor: 'primary',
        '@sm_bgColor': 'secondary',
        '@md_bgColor': 'danger',
      } as any)

      // Both custom properties should exist
      expect(result.style).toHaveProperty('--media-sm__background-color')
      expect(result.style).toHaveProperty('--media-md__background-color')

      expect((result.style as AnyStyle)['--media-sm__background-color']).toBe(
        'var(--media-sm) #6c757d',
      )
      expect((result.style as AnyStyle)['--media-md__background-color']).toBe(
        'var(--media-md) #dc3545',
      )

      // Chain should be nested: md wraps sm wraps base (sorted ascending)
      expect((result.style as AnyStyle)['backgroundColor']).toBe(
        'var(--media-md__background-color, var(--media-sm__background-color, #007bff))',
      )
    })

    test('root-level @breakpoint in stylesheet is type-safe', () => {
      const bgColor = defineToken({
        values: ['primary', 'secondary'] as const,
        resolve: (v) => ({
          backgroundColor: v === 'primary' ? '#007bff' : '#6c757d',
        }),
      })

      const paddingX = defineToken({
        values: [1, 2, 3, 4] as const,
        resolve: (v) => ({ paddingLeft: v * 4, paddingRight: v * 4 }),
      })

      const { stylesheet } = defineSystem(
        { bgColor, paddingX },
        { breakpoints: { __breakpoints: { sm: 640, md: 768 } } },
      )

      // This should compile without type errors:
      // root-level '@md' targeting elements with token values
      const styles = stylesheet({
        container: { bgColor: 'primary', paddingX: 2 },
        label: { bgColor: 'secondary' },
        '@md': {
          container: { paddingX: 4 },
          label: { bgColor: 'primary' },
        },
        '@sm': {
          container: { paddingX: 3 },
        },
      })

      // The stylesheet should exist (types compiled without error)
      expect(styles).toBeDefined()
    })

    test('does not produce CSS variable output when no breakpoints are configured', () => {
      const { exec } = defineSystem({
        bgColor: defineToken({
          values: ['primary', 'secondary'] as const,
          resolve: (v) => ({
            backgroundColor: v === 'primary' ? '#007bff' : '#6c757d',
          }),
        }),
      })

      const result = exec({ tokens: {}, useClassName: false }, {
        bgColor: 'primary',
        '@sm_bgColor': 'secondary',
      } as any)

      // Without breakpoints config, @-prefixed keys are consumed but no variable chain is generated
      expect(result.style).toEqual({ backgroundColor: '#007bff' })
    })
  })
})
