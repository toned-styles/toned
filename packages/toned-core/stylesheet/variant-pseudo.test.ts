/**
 * States inside variants, css pseudo mode — the pairing a design system's
 * variant table is made of (an outline button's hover is not a ghost button's
 * hover). Proves the whole chain: variants() → flattenRules (`:hover_prop`
 * keys) → exec's pseudoOverrides → var(--toned_hover) fallback chains.
 */
import { describe, expect, test } from 'vitest'
import { generate } from '../dom/generate.ts'
import { defineSystem, defineToken } from '../system/index.ts'
import { SYMBOL_INIT } from '../utils/symbols.ts'

const bgColor = defineToken({
  values: ['primary', 'accent', 'muted'] as const,
  resolve: (value, tokens) => ({ backgroundColor: tokens[value] }),
  alphaChannel: ['backgroundColor'],
})

const system = defineSystem(
  { bgColor },
  { breakpoints: { __breakpoints: { md: 768 } } },
)

const config = {
  getTokens: () =>
    new Proxy({}, { get: (_t, p: string) => `var(--${String(p)})` }),
  useClassName: false,
  useMedia: false,
  mediaMode: false as const,
  pseudoMode: 'css' as const,
  debug: false,
  getProps() {
    return {}
  },
  initRef: () => {},
  initInteraction: () => {},
}

describe('pseudo keys inside variant element blocks, css mode', () => {
  const sheet = system
    .stylesheet({
      root: { bgColor: 'muted' },
    })
    .variants<{ variant: 'solid' | 'ghost' }>(($) => ({
      [$.variant('solid')]: {
        root: { bgColor: 'primary', ':hover': { bgColor: 'accent' } },
      },
      [$.variant('ghost')]: {
        root: { ':hover': { bgColor: 'muted' } },
      },
    }))

  // biome-ignore lint/suspicious/noExplicitAny: test reaches into instances
  const styleFor = (state: Record<string, unknown>): any => {
    // biome-ignore lint/suspicious/noExplicitAny: test reaches into instances
    const base = (sheet as any)[SYMBOL_INIT](config, state)
    return base.getCurrentStyle('root').style
  }

  test('the variant carries its own hover chain', () => {
    const style = styleFor({ variant: 'solid' })
    expect(style['--toned_hover__background-color']).toBe(
      'var(--toned_hover) rgb(from var(--accent) r g b / calc(alpha * var(--toned-alpha-background-color, 1)))',
    )
    expect(style.backgroundColor).toBe(
      'var(--toned_hover__background-color, var(--primary))',
    )
  })

  test('a different variant carries a different hover', () => {
    const style = styleFor({ variant: 'ghost' })
    expect(style['--toned_hover__background-color']).toBe(
      'var(--toned_hover) rgb(from var(--muted) r g b / calc(alpha * var(--toned-alpha-background-color, 1)))',
    )
  })

  test('no runtime interaction handlers are armed for self pseudos in css mode', () => {
    // biome-ignore lint/suspicious/noExplicitAny: test reaches into instances
    const base = (sheet as any)[SYMBOL_INIT](config, { variant: 'solid' })
    expect(base.matcher.interactions['root']).toBeUndefined()
  })

  test('a hover value can carry the alpha modifier', () => {
    const alphaSheet = system.stylesheet({
      root: { bgColor: 'primary', ':hover': { bgColor: 'primary/90' } },
    })
    // biome-ignore lint/suspicious/noExplicitAny: test reaches into instances
    const base = (alphaSheet as any)[SYMBOL_INIT](config, {})
    const style = base.getCurrentStyle('root').style
    expect(style['--toned_hover__background-color']).toBe(
      'var(--toned_hover) rgb(from var(--primary) r g b / calc(alpha * 0.9))',
    )
  })
})

describe('css-only pseudo states and the hover gate', () => {
  test(':focus-visible resolves through the chain like a tracked state', () => {
    const sheet = system.stylesheet({
      root: { bgColor: 'primary', ':focus-visible': { bgColor: 'accent' } },
    })
    // biome-ignore lint/suspicious/noExplicitAny: test reaches into instances
    const base = (sheet as any)[SYMBOL_INIT](config, {})
    const style = base.getCurrentStyle('root').style
    expect(style['--toned_focus-visible__background-color']).toBe(
      'var(--toned_focus-visible) rgb(from var(--accent) r g b / calc(alpha * var(--toned-alpha-background-color, 1)))',
    )
  })
})

describe('css-only group hover (source channel)', () => {
  const sheet = system.stylesheet({
    root: { bgColor: 'primary' },
    icon: { bgColor: 'muted', ':hover': { bgColor: 'primary' } },
    'root:hover': { icon: { bgColor: 'accent' } },
  })
  // biome-ignore lint/suspicious/noExplicitAny: test reaches into instances
  const base: any = (sheet as any)[SYMBOL_INIT](config, {})

  test('the source carries the marker class, no runtime handlers armed', () => {
    const root = base.getCurrentStyle('root')
    expect(root.className).toContain('_s')
    expect(base.matcher.interactions['root']).toBeUndefined()
  })

  test('the target rides the src-hover chain below its own hover', () => {
    const icon = base.getCurrentStyle('icon').style
    expect(icon['--toned_src-hover__background-color']).toBe(
      'var(--toned_src-hover) rgb(from var(--accent) r g b / calc(alpha * var(--toned-alpha-background-color, 1)))',
    )
    expect(icon['--toned_hover__background-color']).toBe(
      'var(--toned_hover) rgb(from var(--primary) r g b / calc(alpha * var(--toned-alpha-background-color, 1)))',
    )
    expect(icon.backgroundColor).toBe(
      'var(--toned_hover__background-color, var(--toned_src-hover__background-color, var(--muted)))',
    )
  })

  test('the generated css declares the channel, hover-gated with nearest-source reset', () => {
    const css = generate(system.system)
    expect(css).toContain('--toned_src-hover: initial;')
    expect(css).toContain(
      '@media (hover: hover) {._s:hover {--toned_src-hover: ;} ._s:hover ._s {--toned_src-hover: initial;} ._s:hover ._s:hover {--toned_src-hover: ;}}',
    )
  })
})

describe('breakpoint raw-style chains', () => {
  test("'@md': { style: {...} } rides the media toggle like a token", () => {
    const sheet = system.stylesheet({
      root: {
        bgColor: 'primary',
        style: { fontSize: '1rem' },
        '@md': { style: { fontSize: '0.875rem' } },
      },
    })
    const mediaConfig = { ...config, useMedia: true, mediaMode: 'css' as const }
    // biome-ignore lint/suspicious/noExplicitAny: test reaches into instances
    const style = (sheet as any)
      [SYMBOL_INIT](mediaConfig, {})
      .getCurrentStyle('root').style
    expect(style['--media-md__font-size__style']).toBe(
      'var(--media-md) 0.875rem',
    )
    expect(style.fontSize).toBe('var(--media-md__font-size__style, 1rem)')
  })
})

describe('declared states (data-state / attribute selectors)', () => {
  const stateSystem = defineSystem(
    { bgColor },
    {
      breakpoints: { __breakpoints: { md: 768 } },
      states: {
        open: "[data-state='open']",
        checked: '[data-state="checked"]',
      },
    },
  )
  const css = generate(stateSystem.system)

  test('each state emits a self-scoped, ungated toggle with nested reset', () => {
    expect(css).toContain('html {--toned_open: initial;}')
    expect(css).toContain(
      "._[data-state='open'] {--toned_open: ;} ._[data-state='open'] ._ {--toned_open: initial;} ._[data-state='open'] ._[data-state='open'] {--toned_open: ;}",
    )
    // not hover-gated
    expect(css).not.toContain('@media (hover: hover) {._[data-state')
  })

  test("a stylesheet's ':open' key rides the chain, OUTERMOST (beats :hover)", () => {
    const sheet = stateSystem.stylesheet({
      root: {
        bgColor: 'muted',
        ':hover': { bgColor: 'accent' },
        ':open': { bgColor: 'primary' },
      },
    })
    // biome-ignore lint/suspicious/noExplicitAny: test reaches into instances
    const style = (sheet as any)
      [SYMBOL_INIT](
        { ...config, useMedia: true, mediaMode: 'css' as const },
        {},
      )
      .getCurrentStyle('root').style
    expect(style['--toned_open__background-color']).toBe(
      'var(--toned_open) rgb(from var(--primary) r g b / calc(alpha * var(--toned-alpha-background-color, 1)))',
    )
    expect(style['--toned_hover__background-color']).toBe(
      'var(--toned_hover) rgb(from var(--accent) r g b / calc(alpha * var(--toned-alpha-background-color, 1)))',
    )
    // open wraps outermost → a data-state=open paint wins over :hover
    expect(style.backgroundColor).toBe(
      'var(--toned_open__background-color, var(--toned_hover__background-color, var(--muted)))',
    )
  })
})
