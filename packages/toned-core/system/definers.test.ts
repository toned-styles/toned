import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import type { Config, ExecConfig } from '../types/index.ts'
import { __resetWarnings } from '../utils/warnOnce.ts'
import { getConfig, setConfig } from './config.ts'
import { defineSystem, defineToken, defineUnit } from './definers.ts'

// biome-ignore lint/suspicious/noExplicitAny: test helper for dynamic style access
type AnyStyle = Record<string, any>

/**
 * `exec()` requires the active media/pseudo modes. These tests assert CSS
 * custom property output, so they default to the mode that produces it.
 */
const execCfg = (over: Partial<ExecConfig> = {}): ExecConfig => ({
  tokens: {},
  useClassName: false,
  mediaMode: 'css',
  pseudoMode: 'css',
  ...over,
})

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

      const result = exec(execCfg(), { bgColor: 'primary', textColor: 'black' })

      expect(result.style).toEqual({
        backgroundColor: '#007bff',
        color: '#000',
      })
    })

    test('resolves a single token', () => {
      const { exec } = defineSystem({ bgColor })

      const result = exec(execCfg(), { bgColor: 'secondary' })

      expect(result.style).toEqual({
        backgroundColor: '#6c757d',
      })
    })
  })

  describe('exec() with className mode', () => {
    test('generates className strings for known token values', () => {
      const { exec } = defineSystem({ bgColor, textColor })

      const result = exec(execCfg({ useClassName: true }), {
        bgColor: 'primary',
        textColor: 'white',
      })

      expect(result.className).toContain('bgColor_primary')
      expect(result.className).toContain('textColor_white')
      // In className mode, known values should not appear in style
      expect(result.style).toEqual({})
    })

    test('falls back to style resolution for unknown values when useClassName is false', () => {
      const { exec } = defineSystem({ bgColor })

      const result = exec(execCfg(), { bgColor: 'primary' })

      expect(result.style).toEqual({ backgroundColor: '#007bff' })
    })
  })

  describe('exec() with style pass-through', () => {
    test('passes raw style objects through', () => {
      const { exec } = defineSystem({ bgColor })

      const result = exec(execCfg(), {
        style: { opacity: 0.5, zIndex: 10 },
      } as any)

      expect(result.style).toEqual({ opacity: 0.5, zIndex: 10 })
    })

    test('merges style with resolved tokens', () => {
      const { exec } = defineSystem({ bgColor })

      const result = exec(execCfg(), {
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

      const result = exec(execCfg(), {
        className: 'custom-class',
      } as any)

      expect(result.className).toContain('custom-class')
    })

    test('combines token classNames with custom className', () => {
      const { exec } = defineSystem({ bgColor })

      const result = exec(execCfg({ useClassName: true }), {
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

      const result = exec(execCfg(), {
        ':hover': { bgColor: 'secondary' },
        bgColor: 'primary',
      } as any)

      expect(result.style).toEqual({ backgroundColor: '#007bff' })
    })

    test('keys starting with $ are ignored', () => {
      const { exec } = defineSystem({ bgColor })

      const result = exec(execCfg(), {
        $variant: 'large',
        bgColor: 'primary',
      } as any)

      expect(result.style).toEqual({ backgroundColor: '#007bff' })
    })

    test('both : and $ keys are ignored simultaneously', () => {
      const { exec } = defineSystem({ bgColor })

      const result = exec(execCfg(), {
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

      const result = exec(execCfg(), {
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

      const result = exec(execCfg(), {
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

      const result = exec(execCfg(), {
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

    test('warns and keeps the base value when no breakpoints are configured', () => {
      const { exec } = defineSystem({
        bgColor: defineToken({
          values: ['primary', 'secondary'] as const,
          resolve: (v) => ({
            backgroundColor: v === 'primary' ? '#007bff' : '#6c757d',
          }),
        }),
      })
      __resetWarnings()
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})

      const result = exec(execCfg(), {
        bgColor: 'primary',
        '@sm_bgColor': 'secondary',
      } as any)

      expect(result.style).toEqual({ backgroundColor: '#007bff' })
      expect(warn.mock.calls[0]?.[0]).toContain('defineSystem')
      warn.mockRestore()
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

      const result = exec(execCfg(), {
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
        return exec(execCfg(), input as any).style as AnyStyle
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

      const result = exec(execCfg(), {
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
})

describe('t() nested selector blocks', () => {
  const padding = defineToken({
    values: ['small', 'large'] as const,
    resolve: (v) => ({ padding: v === 'small' ? 4 : 16 }),
  })

  const gap = defineToken({
    values: ['none', 'wide'] as const,
    resolve: (v) => ({ gap: v === 'none' ? 0 : 12 }),
  })

  const bgColor = defineToken({
    values: ['base', 'accent'] as const,
    resolve: (v) => ({ backgroundColor: v === 'base' ? '#fff' : '#f00' }),
  })

  const breakpoints = { __breakpoints: { sm: 480, md: 768, xl: 1200 } }

  const makeSystem = () =>
    defineSystem({ padding, gap, bgColor }, { breakpoints })

  const original = { ...getConfig() }

  const useConfig = (overrides: Partial<Config>) => {
    setConfig({ getTokens: () => ({}), useClassName: false, ...overrides })
  }

  beforeEach(() => {
    __resetWarnings()
  })

  afterEach(() => {
    setConfig(original)
  })

  describe('web (css mode)', () => {
    beforeEach(() => {
      useConfig({ mediaMode: 'css', pseudoMode: 'css' })
    })

    test('a nested breakpoint block resolves to a CSS variable chain', () => {
      const { t } = makeSystem()

      const style = t({ padding: 'small', '@md': { padding: 'large' } })
        .style as AnyStyle

      expect(style['--media-md__padding']).toBe('var(--media-md) 16px')
      expect(style['padding']).toBe('var(--media-md__padding, 4px)')
    })

    test('a nested block matches the flattened form exactly', () => {
      const { t } = makeSystem()

      const nested = t({ padding: 'small', '@md': { padding: 'large' } }).style
      const flat = t({
        padding: 'small',
        '@md_padding': 'large',
      } as AnyStyle).style

      expect(nested).toEqual(flat)
    })

    test('multiple breakpoints cascade with the largest outermost', () => {
      const { t } = makeSystem()

      const style = t({
        padding: 'small',
        '@md': { padding: 'large' },
        '@xl': { padding: 'small' },
      }).style as AnyStyle

      // Distinct values, so this pins which one wins rather than just which
      // variable names appear.
      expect(style['--media-md__padding']).toBe('var(--media-md) 16px')
      expect(style['--media-xl__padding']).toBe('var(--media-xl) 4px')
      expect(style['padding']).toBe(
        'var(--media-xl__padding, var(--media-md__padding, 4px))',
      )
    })

    test('a nested pseudo block resolves to a CSS variable chain', () => {
      const { t } = makeSystem()

      const style = t({ bgColor: 'base', ':hover': { bgColor: 'accent' } })
        .style as AnyStyle

      expect(style['--toned_hover__background-color']).toBe(
        'var(--toned_hover) #f00',
      )
      expect(style['backgroundColor']).toBe(
        'var(--toned_hover__background-color, #fff)',
      )
    })

    test('separate arguments targeting one breakpoint compose', () => {
      const { t } = makeSystem()

      const style = t(
        { padding: 'small', gap: 'none', '@md': { padding: 'large' } },
        { '@md': { gap: 'wide' } },
      ).style as AnyStyle

      // Merging the nested objects would have dropped the padding override.
      expect(style['--media-md__padding']).toBe('var(--media-md) 16px')
      expect(style['--media-md__gap']).toBe('var(--media-md) 12px')
      // Both chains have to be assigned, not just the variables emitted.
      expect(style['padding']).toBe('var(--media-md__padding, 4px)')
      expect(style['gap']).toBe('var(--media-md__gap, 0px)')
    })

    test('a later argument overrides an earlier one for the same property', () => {
      const { t } = makeSystem()

      const style = t(
        { padding: 'small', '@md': { padding: 'large' } },
        { '@md': { padding: 'small' } },
      ).style as AnyStyle

      expect(style['--media-md__padding']).toBe('var(--media-md) 4px')
      expect(style['padding']).toBe('var(--media-md__padding, 4px)')
    })

    test('composes when a t() result is passed back into t()', () => {
      const { t } = makeSystem()

      const inner = t({ padding: 'small', '@md': { padding: 'large' } })
      const style = t(inner).style as AnyStyle

      expect(style['padding']).toBe('var(--media-md__padding, 4px)')
    })

    test("does not mutate the caller's object", () => {
      const { t } = makeSystem()
      const input = {
        padding: 'small',
        '@md': { padding: 'large' },
      } as const

      void t(input).style

      expect(input).toEqual({ padding: 'small', '@md': { padding: 'large' } })
    })

    test('an override with no base value emits a chain with no fallback', () => {
      const { t } = makeSystem()

      const style = t({ '@md': { padding: 'large' } }).style as AnyStyle

      // Resolvers are not required to handle an absent value, so the base must
      // not be resolved at all — a fallback here would be invented, not given.
      expect(style['--media-md__padding']).toBe('var(--media-md) 16px')
      expect(style['padding']).toBe('var(--media-md__padding)')
    })
  })

  describe('web: raw style inside a breakpoint block', () => {
    beforeEach(() => {
      useConfig({ mediaMode: 'css', pseudoMode: 'css' })
    })

    test('wraps the base style value in a chain of its own namespace', () => {
      const { t } = makeSystem()

      const style = t({
        style: { opacity: 1 },
        '@md': { style: { opacity: 0.5 } },
      } as AnyStyle).style as AnyStyle

      expect(style['--media-md__opacity__style']).toBe('var(--media-md) 0.5')
      expect(style['opacity']).toBe('var(--media-md__opacity__style, 1)')
    })

    test('emits a chain with no fallback when there is no base value', () => {
      const { t } = makeSystem()

      const style = t({ '@md': { style: { opacity: 0.5 } } } as AnyStyle)
        .style as AnyStyle

      expect(style['opacity']).toBe('var(--media-md__opacity__style)')
    })

    test('raw style wins over a token setting the same CSS property', () => {
      const { t } = makeSystem()

      const style = t({
        padding: 'small',
        '@md': { padding: 'large', style: { padding: 24 } },
      } as AnyStyle).style as AnyStyle

      // The token var stays as an inner fallback; raw style is outermost.
      expect(style['--media-md__padding']).toBe('var(--media-md) 16px')
      expect(style['--media-md__padding__style']).toBe('var(--media-md) 24px')
      expect(style['padding']).toBe(
        'var(--media-md__padding__style, var(--media-md__padding, 4px))',
      )
    })

    test('a pseudo chain composes on top of a breakpoint chain', () => {
      const { t } = makeSystem()

      const style = t({
        padding: 'small',
        '@md': { padding: 'large' },
        ':hover': { padding: 'large' },
      }).style as AnyStyle

      expect(style['padding']).toBe(
        'var(--toned_hover__padding, var(--media-md__padding, 4px))',
      )
    })
  })

  describe('web: breakpoints that produce no output', () => {
    beforeEach(() => {
      useConfig({ mediaMode: 'css', pseudoMode: 'css' })
    })

    test('an unregistered breakpoint leaves the base value untouched', () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
      const { t } = makeSystem()

      const style = t({
        padding: 'small',
        '@nope': { padding: 'large' },
      } as AnyStyle).style as AnyStyle

      // Not stringified into a dead chain: a number still gets a px suffix
      // when written to the DOM.
      expect(style['padding']).toBe(4)
      expect(style['--media-nope__padding']).toBeUndefined()
      warn.mockRestore()
    })

    test('an unregistered breakpoint is reported by name', () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
      const { t } = makeSystem()

      void t({ padding: 'small', '@nope': { padding: 'large' } } as AnyStyle)
        .style

      expect(warn).toHaveBeenCalledTimes(1)
      expect(warn.mock.calls[0]?.[0]).toContain("'@nope'")
      warn.mockRestore()
    })

    test('a multi-word breakpoint reports the unregistered name it parsed', () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
      const { t } = makeSystem()

      // exec splits on the first underscore, so '@small_screen' is read as the
      // breakpoint '@small'. Naming it beats dropping it in silence.
      void t({
        padding: 'small',
        '@small_screen': { padding: 'large' },
      } as AnyStyle).style

      expect(warn.mock.calls[0]?.[0]).toContain("'@small'")
      warn.mockRestore()
    })
  })

  describe('native (non-css mode)', () => {
    let warn: ReturnType<typeof vi.spyOn>

    beforeEach(() => {
      useConfig({ mediaMode: false, pseudoMode: 'runtime' })
      warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    })

    afterEach(() => {
      warn.mockRestore()
    })

    test('drops breakpoint overrides but keeps the base value', () => {
      const { t } = makeSystem()

      const style = t({ padding: 'small', '@md': { padding: 'large' } })
        .style as AnyStyle

      expect(style).toEqual({ padding: 4 })
    })

    test('emits no unparseable CSS var() strings', () => {
      const { t } = makeSystem()

      const style = t({ padding: 'small', '@md': { padding: 'large' } })
        .style as AnyStyle

      for (const value of Object.values(style)) {
        expect(String(value)).not.toContain('var(')
      }
    })

    test('names the config that would enable breakpoints, not the platform', () => {
      const { t } = makeSystem()

      void t({ padding: 'small', '@md': { padding: 'large' } }).style

      expect(warn).toHaveBeenCalledTimes(1)
      const message = String(warn.mock.calls[0]?.[0])
      expect(message).toContain('[toned]')
      expect(message).toContain('breakpoint')
      expect(message).toContain("mediaMode: 'css'")
      // The active value is reported so the fix is obvious.
      expect(message).toContain('mediaMode: false')
      expect(message).not.toContain('this platform')
    })

    test("reports 'runtime', the default that most apps hit", () => {
      useConfig({ mediaMode: 'runtime', pseudoMode: 'runtime' })
      const { t } = makeSystem()

      void t({ padding: 'small', '@md': { padding: 'large' } }).style

      expect(String(warn.mock.calls[0]?.[0])).toContain('mediaMode: "runtime"')
    })

    test('warns only once for the same reason', () => {
      const { t } = makeSystem()

      void t({ padding: 'small', '@md': { padding: 'large' } }).style
      void t({ gap: 'none', '@xl': { gap: 'wide' } }).style

      expect(warn).toHaveBeenCalledTimes(1)
    })

    test('drops pseudo overrides but keeps the base value', () => {
      const { t } = makeSystem()

      const style = t({ bgColor: 'base', ':hover': { bgColor: 'accent' } })
        .style as AnyStyle

      expect(style).toEqual({ backgroundColor: '#fff' })
      const message = String(warn.mock.calls[0]?.[0])
      expect(message).toContain('pseudo-state')
      expect(message).toContain("pseudoMode: 'css'")
    })

    test('breakpoint and pseudo drops are reported separately', () => {
      const { t } = makeSystem()

      void t({
        padding: 'small',
        '@md': { padding: 'large' },
        ':hover': { bgColor: 'accent' },
      }).style

      expect(warn).toHaveBeenCalledTimes(2)
    })

    test('styles with no selector blocks are untouched and silent', () => {
      const { t } = makeSystem()

      const style = t({ padding: 'small' }).style as AnyStyle

      expect(style).toEqual({ padding: 4 })
      expect(warn).not.toHaveBeenCalled()
    })
  })

  describe('web with runtime pseudo mode', () => {
    // examples/vite ships this exact combination: CSS media queries, but
    // pseudo-states still handled by JS listeners.
    beforeEach(() => {
      useConfig({ mediaMode: 'css', pseudoMode: 'runtime' })
    })

    test('breakpoints still resolve while pseudo overrides are dropped', () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
      const { t } = makeSystem()

      const style = t({
        padding: 'small',
        '@md': { padding: 'large' },
        ':hover': { bgColor: 'accent' },
      }).style as AnyStyle

      expect(style['padding']).toBe('var(--media-md__padding, 4px)')
      expect(style['backgroundColor']).toBeUndefined()
      expect(String(warn.mock.calls[0]?.[0])).toContain("pseudoMode: 'css'")
      warn.mockRestore()
    })
  })
})

describe('exec() selector cascade ordering', () => {
  const cfg = {
    tokens: {},
    useClassName: false,
    mediaMode: 'css',
    pseudoMode: 'css',
  } as const

  const padding = defineToken({
    values: ['small', 'large'] as const,
    resolve: (v) => ({ padding: v === 'small' ? 4 : 16 }),
  })

  // Two token props that deliberately resolve to the same CSS property.
  const color = defineToken({
    values: ['white', 'black'] as const,
    resolve: (v) => ({ color: v === 'white' ? '#fff' : '#000' }),
  })
  const textColor = defineToken({
    values: ['white', 'black'] as const,
    resolve: (v) => ({ color: v === 'white' ? '#fff' : '#000' }),
  })

  const breakpoints = { __breakpoints: { sm: 480, xl: 1200 } }

  beforeEach(() => {
    __resetWarnings()
  })

  test('a wider breakpoint outranks a narrower one raw style', () => {
    const { exec } = defineSystem({ padding }, { breakpoints })

    const style = exec(cfg, {
      padding: 'small',
      '@xl_padding': 'large',
      '@sm_style': { padding: 99 },
    } as AnyStyle).style as AnyStyle

    // Both toggles are on above 1200px, so whichever var sits outermost wins.
    // Width has to decide that, not whether the value came from `style`.
    expect(style['padding']).toBe(
      'var(--media-xl__padding, var(--media-sm__padding__style, 4px))',
    )
  })

  test('raw style still outranks a token at the same breakpoint', () => {
    const { exec } = defineSystem({ padding }, { breakpoints })

    const style = exec(cfg, {
      padding: 'small',
      '@sm_padding': 'large',
      '@sm_style': { padding: 99 },
    } as AnyStyle).style as AnyStyle

    expect(style['padding']).toBe(
      'var(--media-sm__padding__style, var(--media-sm__padding, 4px))',
    )
  })

  test(':active outranks a :hover raw style', () => {
    const { exec } = defineSystem({ padding }, { breakpoints })

    const style = exec(cfg, {
      padding: 'small',
      ':active_padding': 'large',
      ':hover_style': { padding: 99 },
    } as AnyStyle).style as AnyStyle

    expect(style['padding']).toBe(
      'var(--toned_active__padding, var(--toned_hover__padding__style, 4px))',
    )
  })

  test('key order does not decide which breakpoint wins', () => {
    const { exec } = defineSystem({ color, textColor }, { breakpoints })

    const run = (input: AnyStyle) =>
      (exec(cfg, input).style as AnyStyle)['color']

    const expected = 'var(--media-xl__color, var(--media-sm__color, #fff))'

    expect(
      run({ color: 'white', '@sm_textColor': 'white', '@xl_color': 'black' }),
    ).toBe(expected)
    expect(
      run({ color: 'white', '@xl_color': 'black', '@sm_textColor': 'white' }),
    ).toBe(expected)
  })

  test('two props on one CSS property share a single custom property', () => {
    const { exec } = defineSystem({ color, textColor }, { breakpoints })

    const style = exec(cfg, {
      color: 'white',
      '@sm_color': 'black',
      '@sm_textColor': 'white',
    } as AnyStyle).style as AnyStyle

    // One toggle, one property name — so one link, not the same var nested
    // inside its own fallback.
    expect(style['color']).toBe('var(--media-sm__color, #fff)')
    // Later declaration wins, matching how their base values merge.
    expect(style['--media-sm__color']).toBe('var(--media-sm) #fff')
  })
})

describe('exec() reports overrides it cannot compile', () => {
  const cfg = {
    tokens: {},
    useClassName: false,
    mediaMode: 'css',
    pseudoMode: 'css',
  } as const

  const padding = defineToken({
    values: ['small', 'large'] as const,
    resolve: (v) => ({ padding: v === 'small' ? 4 : 16 }),
  })

  const breakpoints = { __breakpoints: { sm: 480, md: 768 } }

  let warn: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    __resetWarnings()
    warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
  })

  afterEach(() => {
    warn.mockRestore()
  })

  const messages = () => warn.mock.calls.map((c) => String(c[0]))

  test('an unsupported pseudo-state is named', () => {
    const { exec } = defineSystem({ padding }, { breakpoints })

    const style = exec(cfg, {
      padding: 'small',
      ':checked_padding': 'large',
    } as AnyStyle).style as AnyStyle

    expect(style).toEqual({ padding: 4 })
    expect(messages()[0]).toContain("':checked'")
    expect(messages()[0]).toContain(':hover')
  })

  test('an override on something that is not a token is named', () => {
    const { exec } = defineSystem({ padding }, { breakpoints })

    const style = exec(cfg, {
      padding: 'small',
      '@md_paddingX': 'large',
    } as AnyStyle).style as AnyStyle

    expect(style).toEqual({ padding: 4 })
    expect(messages()[0]).toContain("'paddingX'")
  })

  test('a selector nested inside a selector block is named', () => {
    const { t } = defineSystem({ padding }, { breakpoints })
    const original = { ...getConfig() }
    setConfig({ getTokens: () => ({}), mediaMode: 'css', pseudoMode: 'css' })

    // Blocks are one level deep; ':hover' here is read as a token name.
    const style = t({ '@md': { ':hover': { padding: 'large' } } } as AnyStyle)
      .style as AnyStyle

    expect(style).toEqual({})
    expect(messages()[0]).toContain("':hover'")
    setConfig(original)
  })

  test('two systems with different breakpoints each report their own', () => {
    const a = defineSystem({ padding }, { breakpoints })
    const b = defineSystem(
      { padding },
      { breakpoints: { __breakpoints: { tablet: 700, desktop: 1100 } } },
    )

    a.exec(cfg, { '@lg_padding': 'large' } as AnyStyle)
    b.exec(cfg, { '@lg_padding': 'large' } as AnyStyle)

    // Same selector, different systems: one message must not silence the other.
    expect(warn).toHaveBeenCalledTimes(2)
    expect(messages()[0]).toContain('@sm')
    expect(messages()[1]).toContain('@tablet')
  })

  test('an identical problem is still only reported once', () => {
    const { exec } = defineSystem({ padding }, { breakpoints })

    exec(cfg, { '@lg_padding': 'large' } as AnyStyle)
    exec(cfg, { '@lg_padding': 'small' } as AnyStyle)

    expect(warn).toHaveBeenCalledTimes(1)
  })
})

describe('exec() breakpoint toggle names', () => {
  const cfg = {
    tokens: {},
    useClassName: false,
    mediaMode: 'css',
    pseudoMode: 'css',
  } as const

  const padding = defineToken({
    values: ['small', 'large'] as const,
    resolve: (v) => ({ padding: v === 'small' ? 4 : 16 }),
  })

  test('kebab-cases a camelCase breakpoint to match the generated @media rule', () => {
    const { exec } = defineSystem(
      { padding },
      { breakpoints: { __breakpoints: { tabletLandscape: 900 } } },
    )

    const style = exec(cfg, {
      padding: 'small',
      '@tabletLandscape_padding': 'large',
    } as AnyStyle).style as AnyStyle

    // dom/generate.ts declares `--media-tablet-landscape`, so referencing
    // `--media-tabletLandscape` here would never fire.
    expect(style['--media-tablet-landscape__padding']).toBe(
      'var(--media-tablet-landscape) 16px',
    )
    expect(style['padding']).toBe('var(--media-tablet-landscape__padding, 4px)')
  })

  test('leaves a single-word breakpoint name untouched', () => {
    const { exec } = defineSystem(
      { padding },
      { breakpoints: { __breakpoints: { md: 768 } } },
    )

    const style = exec(cfg, {
      padding: 'small',
      '@md_padding': 'large',
    } as AnyStyle).style as AnyStyle

    expect(style['--media-md__padding']).toBe('var(--media-md) 16px')
  })
})

describe('t() merges raw style inside selector blocks', () => {
  const bgColor = defineToken({
    values: ['base', 'accent'] as const,
    resolve: (v) => ({ backgroundColor: v === 'base' ? '#fff' : '#f00' }),
  })
  const breakpoints = { __breakpoints: { sm: 480 } }
  const original = { ...getConfig() }

  beforeEach(() => {
    __resetWarnings()
    setConfig({
      getTokens: () => ({}),
      useClassName: false,
      mediaMode: 'css',
      pseudoMode: 'css',
    })
  })

  afterEach(() => {
    setConfig(original)
  })

  test('a breakpoint style block extends an earlier argument', () => {
    const { t } = defineSystem({ bgColor }, { breakpoints })

    const style = t(
      { '@sm': { style: { top: 1 } } } as AnyStyle,
      { '@sm': { style: { left: 2 } } } as AnyStyle,
    ).style as AnyStyle

    // Top-level `style` already composes across arguments; the per-selector
    // form has to behave the same way or the rule is arbitrary.
    expect(style['--media-sm__top__style']).toBe('var(--media-sm) 1px')
    expect(style['--media-sm__left__style']).toBe('var(--media-sm) 2px')
  })

  test('a pseudo style block extends an earlier argument', () => {
    const { t } = defineSystem({ bgColor }, { breakpoints })

    const style = t(
      { ':hover': { style: { top: 1 } } } as AnyStyle,
      { ':hover': { style: { left: 2 } } } as AnyStyle,
    ).style as AnyStyle

    expect(style['--toned_hover__top__style']).toBe('var(--toned_hover) 1px')
    expect(style['--toned_hover__left__style']).toBe('var(--toned_hover) 2px')
  })

  test('a later argument still overrides the same property', () => {
    const { t } = defineSystem({ bgColor }, { breakpoints })

    const style = t(
      { '@sm': { style: { top: 1 } } } as AnyStyle,
      { '@sm': { style: { top: 2 } } } as AnyStyle,
    ).style as AnyStyle

    expect(style['--media-sm__top__style']).toBe('var(--media-sm) 2px')
  })

  test('an array style in a block is flattened, not indexed', () => {
    const { t } = defineSystem({ bgColor }, { breakpoints })

    const style = t({
      bgColor: 'base',
      '@sm': { style: [{ top: 1 }, { left: 2 }] },
    } as AnyStyle).style as AnyStyle

    // React Native accepts array styles; indexing into one would emit a CSS
    // property called "0" holding "[object Object]".
    expect(style['--media-sm__top__style']).toBe('var(--media-sm) 1px')
    expect(style['--media-sm__left__style']).toBe('var(--media-sm) 2px')
    expect(style).not.toHaveProperty('0')
  })

  test('an array style at the base is flattened the same way', () => {
    const { t } = defineSystem({ bgColor }, { breakpoints })

    // Base and block styles have to agree; anything else is arbitrary.
    const style = t({ style: [{ top: 1 }, { left: 2 }] } as AnyStyle)
      .style as AnyStyle

    expect(style).toEqual({ top: 1, left: 2 })
  })

  test('array styles compose across arguments', () => {
    const { t } = defineSystem({ bgColor }, { breakpoints })

    const style = t(
      { style: [{ top: 1 }] } as AnyStyle,
      { style: [{ left: 2 }] } as AnyStyle,
    ).style as AnyStyle

    expect(style).toEqual({ top: 1, left: 2 })
  })

  test('a $-prefixed key in a block is skipped as quietly as at the top level', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const { t } = defineSystem({ bgColor }, { breakpoints })

    const style = t({
      bgColor: 'base',
      '@sm': { $$type: 'view' },
    } as AnyStyle).style as AnyStyle

    expect(style).toEqual({ backgroundColor: '#fff' })
    expect(warn).not.toHaveBeenCalled()
    warn.mockRestore()
  })
})

describe('exec() unit suffixing through selector chains', () => {
  // A resolver may return a length as a bare number, because the same style map
  // has to serve React Native. On web that only renders because something later
  // appends `px` — `applyStyles` for stylesheet(), React's `style` prop for
  // t(). Both of those check `typeof value === 'number'`, so the moment a
  // property holds a var() chain the check stops firing and the unit has to
  // already be in the CSS text.

  const padding = defineToken({
    values: ['small', 'large'] as const,
    resolve: (v) => ({ padding: v === 'small' ? 8 : 24 }),
  })

  const opacity = defineToken({
    values: ['half', 'full'] as const,
    resolve: (v) => ({ opacity: v === 'half' ? 0.5 : 1 }),
  })

  const inset = defineToken({
    values: ['none', 'far'] as const,
    resolve: (v) => ({ top: v === 'none' ? 0 : 12, left: v === 'none' ? 0 : 12 }),
  })

  const breakpoints = { __breakpoints: { sm: 480, md: 768 } }
  const make = () => defineSystem({ padding, opacity, inset }, { breakpoints })

  test('a numeric base with no override stays a number', () => {
    // Nothing to chain, so the value must survive as a number for the usual
    // downstream suffixing. Stringifying it here would be a silent behaviour
    // change for every non-responsive style.
    const { exec } = make()

    const style = exec(execCfg(), { padding: 'small' }) .style as AnyStyle

    expect(style['padding']).toBe(8)
  })

  test('a numeric override and its numeric base both gain px', () => {
    const { exec } = make()

    const style = exec(execCfg(), {
      padding: 'small',
      '@md_padding': 'large',
    } as AnyStyle).style as AnyStyle

    expect(style['--media-md__padding']).toBe('var(--media-md) 24px')
    expect(style['padding']).toBe('var(--media-md__padding, 8px)')
  })

  test('every level of a multi-breakpoint chain is a valid length', () => {
    const { exec } = make()

    const style = exec(execCfg(), {
      padding: 'small',
      '@sm_padding': 'large',
      '@md_padding': 'small',
    } as AnyStyle).style as AnyStyle

    expect(style['--media-sm__padding']).toBe('var(--media-sm) 24px')
    expect(style['--media-md__padding']).toBe('var(--media-md) 8px')
    expect(style['padding']).toBe(
      'var(--media-md__padding, var(--media-sm__padding, 8px))',
    )

    // No bare number may survive anywhere in the emitted CSS text.
    for (const value of Object.values(style)) {
      expect(String(value)).not.toMatch(/(?:^|[\s,])\d+(?:\.\d+)?(?:[,)]|$)/)
    }
  })

  test('a pseudo chain layered on a breakpoint chain keeps units at every level', () => {
    const { exec } = make()

    const style = exec(execCfg(), {
      padding: 'small',
      '@md_padding': 'large',
      ':hover_padding': 'large',
    } as AnyStyle).style as AnyStyle

    expect(style['padding']).toBe(
      'var(--toned_hover__padding, var(--media-md__padding, 8px))',
    )
  })

  test('unitless properties are left bare', () => {
    const { exec } = make()

    const style = exec(execCfg(), {
      opacity: 'full',
      '@md_opacity': 'half',
    } as AnyStyle).style as AnyStyle

    expect(style['--media-md__opacity']).toBe('var(--media-md) 0.5')
    expect(style['opacity']).toBe('var(--media-md__opacity, 1)')
  })

  test('a zero length is suffixed rather than left bare', () => {
    const { exec } = make()

    const style = exec(execCfg(), {
      inset: 'none',
      '@md_inset': 'far',
    } as AnyStyle).style as AnyStyle

    expect(style['top']).toBe('var(--media-md__top, 0px)')
    expect(style['left']).toBe('var(--media-md__left, 0px)')
  })

  test('a raw style block gets the same treatment as a token', () => {
    const { exec } = make()

    const style = exec(execCfg(), {
      style: { top: 4 },
      '@md_style': { top: 16 },
    } as AnyStyle).style as AnyStyle

    expect(style['--media-md__top__style']).toBe('var(--media-md) 16px')
    expect(style['top']).toBe('var(--media-md__top__style, 4px)')
  })

  test('className mode still produces a unit-correct fallback', () => {
    // The base is emitted as a class, so it is absent from acc.style and the
    // fallback is resolved separately. If it were unitless the declaration
    // would be invalid and would *not* fall back to the class rule.
    const { exec } = make()

    const result = exec(execCfg({ useClassName: true }), {
      padding: 'small',
      '@md_padding': 'large',
    } as AnyStyle)
    const style = result.style as AnyStyle

    expect(result.className).toContain('padding_small')
    expect(style['padding']).toBe('var(--media-md__padding, 8px)')
  })

  test('native drops the overrides and leaves the base a number', () => {
    // React Native has no var() and no px strings; the number must reach the
    // style map untouched.
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const { exec } = make()

    const style = exec(execCfg({ mediaMode: false, pseudoMode: 'runtime' }), {
      padding: 'small',
      '@md_padding': 'large',
    } as AnyStyle).style as AnyStyle

    expect(style).toEqual({ padding: 8 })
    warn.mockRestore()
  })
})
