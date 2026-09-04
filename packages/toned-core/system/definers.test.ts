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

  describe('exec() nested pseudo blocks and $ keys', () => {
    // Nested pseudo blocks used to be silently ignored here (the stylesheet
    // path pre-flattens them, so only t() ever hit this) — now exec flattens
    // them itself, so t() carries pseudo and breakpoint blocks too.
    test('a nested : block builds the pseudo chain', () => {
      const { exec } = defineSystem({ bgColor })

      const result = exec({ tokens: {}, useClassName: false }, {
        ':hover': { bgColor: 'secondary' },
        bgColor: 'primary',
      } as any)

      expect(result.style).toEqual({
        '--toned_hover__background-color': 'var(--toned_hover) #6c757d',
        backgroundColor: 'var(--toned_hover__background-color, #007bff)',
      })
    })

    test('keys starting with $ are ignored', () => {
      const { exec } = defineSystem({ bgColor })

      const result = exec({ tokens: {}, useClassName: false }, {
        $variant: 'large',
        bgColor: 'primary',
      } as any)

      expect(result.style).toEqual({ backgroundColor: '#007bff' })
    })

    test('a nested : block chains while $ keys stay ignored', () => {
      const { exec } = defineSystem({ bgColor })

      const result = exec({ tokens: {}, useClassName: false }, {
        ':focus': { bgColor: 'secondary' },
        $size: 'lg',
        bgColor: 'primary',
      } as any)

      expect(result.style).toEqual({
        '--toned_focus__background-color': 'var(--toned_focus) #6c757d',
        backgroundColor: 'var(--toned_focus__background-color, #007bff)',
      })
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

  describe('t() deep-merges style across arguments', () => {
    test('combines style objects from multiple arguments', () => {
      const { t } = defineSystem({ bgColor })

      const result = t(
        { style: { backgroundColor: 'yellow' } },
        { style: { color: 'magenta' } },
      )

      expect(result.style).toEqual({
        backgroundColor: 'yellow',
        color: 'magenta',
      })
    })

    test('later arguments override earlier ones for the same property', () => {
      const { t } = defineSystem({ bgColor })

      const result = t(
        { style: { backgroundColor: 'yellow', color: 'red' } },
        { style: { color: 'magenta' } },
      )

      expect(result.style).toEqual({
        backgroundColor: 'yellow',
        color: 'magenta',
      })
    })

    test('merges style alongside resolved tokens', () => {
      const { t } = defineSystem({ bgColor })

      const result = t(
        { bgColor: 'primary', style: { opacity: 0.5 } },
        { style: { color: 'magenta' } },
      )

      expect(result.style).toEqual({
        backgroundColor: '#007bff',
        opacity: 0.5,
        color: 'magenta',
      })
    })

    test('passes a single argument through unchanged', () => {
      const { t } = defineSystem({ bgColor })

      const result = t({ style: { color: 'magenta' } })

      expect(result.style).toEqual({ color: 'magenta' })
    })
  })

  describe('exec() pseudo-state raw style precedence', () => {
    test('raw style in a pseudo builds a var fallback chain', () => {
      const { exec } = defineSystem({ bgColor })

      const result = exec({ tokens: {}, useClassName: false }, {
        style: { cursor: 'pointer' },
        ':hover_style': { cursor: 'grab' },
      } as any)

      expect((result.style as AnyStyle)['--toned_hover__cursor__style']).toBe(
        'var(--toned_hover) grab',
      )
      expect((result.style as AnyStyle)['cursor']).toBe(
        'var(--toned_hover__cursor__style, pointer)',
      )
    })

    test('raw style deterministically overrides a token for the same CSS property, regardless of key order', () => {
      const { exec } = defineSystem({ textColor })

      const run = (styleFirst: boolean) => {
        const input = styleFirst
          ? {
              textColor: 'white',
              ':hover_style': { color: 'red' },
              ':hover_textColor': 'black',
            }
          : {
              textColor: 'white',
              ':hover_textColor': 'black',
              ':hover_style': { color: 'red' },
            }
        return exec({ tokens: {}, useClassName: false }, input as any)
          .style as AnyStyle
      }

      for (const styleFirst of [false, true]) {
        const style = run(styleFirst)
        // Token var is still emitted (kept as an inner fallback)…
        expect(style['--toned_hover__color']).toBe('var(--toned_hover) #000')
        // …the raw-style var lives in its own namespace…
        expect(style['--toned_hover__color__style']).toBe(
          'var(--toned_hover) red',
        )
        // …and style is outermost, so it wins on :hover, then token, then base.
        expect(style['color']).toBe(
          'var(--toned_hover__color__style, var(--toned_hover__color, #fff))',
        )
      }
    })

    test('token-only pseudo overrides are unaffected (no __style namespace)', () => {
      const { exec } = defineSystem({ bgColor })

      const result = exec({ tokens: {}, useClassName: false }, {
        bgColor: 'primary',
        ':hover_bgColor': 'secondary',
      } as any).style as AnyStyle

      expect(result['--toned_hover__background-color']).toBe(
        'var(--toned_hover) #6c757d',
      )
      expect(result['backgroundColor']).toBe(
        'var(--toned_hover__background-color, #007bff)',
      )
      expect(result['--toned_hover__background-color__style']).toBeUndefined()
    })
  })

  describe('per-platform token resolve (§4)', () => {
    // A token whose resolve branches on the platform carried in the context —
    // box-shadow on web, RN shadow* props on native. This is the one core-side
    // affordance the bound-layer spec asks for (elevation, gradients, etc.).
    const elevation = defineToken({
      values: ['sm'] as const,
      resolve: (_v, _tokens, ctx) =>
        ctx?.platform === 'native'
          ? { shadowRadius: 4, shadowOpacity: 0.2 }
          : { boxShadow: '0 1px 4px rgba(0,0,0,0.2)' },
    })

    test('web platform resolves to box-shadow', () => {
      const { exec } = defineSystem({ elevation })
      const style = exec(
        { tokens: {}, useClassName: false, platform: 'web' },
        { elevation: 'sm' },
      ).style as AnyStyle
      expect(style['boxShadow']).toBe('0 1px 4px rgba(0,0,0,0.2)')
      expect(style['shadowRadius']).toBeUndefined()
    })

    test('native platform resolves to shadow* props', () => {
      const { exec } = defineSystem({ elevation })
      const style = exec(
        { tokens: {}, useClassName: false, platform: 'native' },
        { elevation: 'sm' },
      ).style as AnyStyle
      expect(style['shadowRadius']).toBe(4)
      expect(style['shadowOpacity']).toBe(0.2)
      expect(style['boxShadow']).toBeUndefined()
    })
  })
})

describe('exec() chain fidelity (css pseudo mode, className on)', () => {
  // biome-ignore lint/suspicious/noExplicitAny: test-side dynamic style shape
  type AnyStyle = Record<string, any>

  const shadowStep = defineToken({
    values: ['rest'] as const,
    resolve: () => ({ boxShadow: '0 1px 2px 0 #000' }),
  })
  const ring = defineToken({
    values: ['focus'] as const,
    resolve: () => ({ boxShadow: '0 0 0 3px #f00' }),
  })
  const borderColor = defineToken({
    values: ['input'] as const,
    resolve: () => ({ borderColor: 'var(--input)' }),
    alphaChannel: ['borderColor'],
  })

  test('a resting value on ANOTHER token survives as the chain fallback', () => {
    // In className mode the resting box-shadow is an atomic class, so the
    // chain built for the state override must dig it out of the OTHER base
    // token — without that, the resting paint vanishes the moment any state
    // override touches the property (native-select lost its shadow-xs).
    const { exec } = defineSystem({ shadowStep, ring })
    const style = exec(
      { tokens: {}, useClassName: true },
      { shadowStep: 'rest', ':focus-visible_ring': 'focus' },
    ).style as AnyStyle
    expect(String(style['boxShadow'])).toContain('--toned_focus-visible__box-shadow')
    expect(String(style['boxShadow'])).toContain('0 1px 2px 0 #000')
  })

  test('alpha-channel chain values carry the class-fidelity RCS wrapper', () => {
    // The atomic class paints rgb(from X r g b / calc(alpha * var(…, 1))).
    // The chain must paint the SAME expression for both the override var and
    // the resting fallback, or the browser serializes the two forms a hair
    // apart (a 1/255 alpha shift on every hairline the drain touched).
    const { exec } = defineSystem({ borderColor })
    const style = exec(
      { tokens: {}, useClassName: true },
      { borderColor: 'input', ':focus-visible_borderColor': 'input' },
    ).style as AnyStyle
    const wrapped =
      'rgb(from var(--input) r g b / calc(alpha * var(--toned-alpha-border-color, 1)))'
    expect(String(style['--toned_focus-visible__border-color'])).toContain(wrapped)
    expect(String(style['borderColor'])).toContain(wrapped)
  })
})

describe('exec() media chains without a resting value', () => {
  const makeSystem = () =>
    defineSystem(
      {
        maxWidth: defineToken({
          values: ['s', 'l'] as const,
          resolve: (v) => ({ maxWidth: v === 's' ? '20rem' : '40rem' }),
        }),
      },
      { breakpoints: { __breakpoints: { sm: 640, md: 768 } } },
    )

  test('a media-only prop ends its chain OPEN instead of resolving undefined', () => {
    const { exec } = makeSystem()
    const result = exec({ tokens: {}, useClassName: false }, {
      '@md_maxWidth': 'l',
    } as any)

    const style = result.style as Record<string, unknown>
    expect(style['--media-md__max-width']).toBe('var(--media-md) 40rem')
    // No fallback: an unset var() is invalid-at-computed-value, i.e. unset
    // below the breakpoint. Resolving the missing base through a unit used to
    // produce calc(NaN) here, which computes to 0 and collapsed layouts.
    expect(style['maxWidth']).toBe('var(--media-md__max-width)')
    expect(JSON.stringify(style)).not.toContain('NaN')
  })

  test('a nested breakpoint BLOCK (the t() path) reaches the chain', () => {
    const { exec } = makeSystem()
    const result = exec({ tokens: {}, useClassName: false }, {
      maxWidth: 's',
      '@md': { maxWidth: 'l' },
    } as any)

    const style = result.style as Record<string, unknown>
    expect(style['--media-md__max-width']).toBe('var(--media-md) 40rem')
    expect(style['maxWidth']).toBe('var(--media-md__max-width, 20rem)')
  })

  test('a nested pseudo BLOCK (the t() path) reaches the pseudo chain', () => {
    const { exec } = makeSystem()
    const result = exec({ tokens: {}, useClassName: false }, {
      maxWidth: 's',
      ':hover': { maxWidth: 'l' },
    } as any)

    const style = result.style as Record<string, unknown>
    expect(String(style['maxWidth'])).toContain('--toned_hover__max-width')
  })
})
