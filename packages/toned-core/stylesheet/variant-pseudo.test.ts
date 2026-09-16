/**
 * States inside variants, css pseudo mode — the pairing a design system's
 * variant table is made of (an outline button's hover is not a ghost button's
 * hover). Proves variant selection through the shared plan and emitted CSS
 * guard outcomes, without depending on private parameter names.
 */
import { describe, expect, test } from 'vitest'
import { cssTestValue } from '../backends/css/test-values.test.helpers.ts'
import { generate } from '../dom/generate.ts'
import { defineSystem, defineToken } from '../system/index.ts'
import { SYMBOL_INIT } from '../utils/symbols.ts'

const wrapped = (
  name: string,
  alpha = 'var(--toned-alpha-background-color, 1)',
) => `rgb(from var(--${name}) r g b / calc(alpha * ${alpha}))`
function expectPaint(
  style: Record<string, unknown>,
  toggles: Record<string, boolean>,
  name: string,
  alpha?: string,
  requireWrapper = false,
) {
  const actual = cssTestValue(style, 'backgroundColor', toggles)
  // With no alpha change, a literal theme reference and its identity-alpha
  // wrapper have the same paint. Conditional alpha must retain its multiplier.
  expect(
    alpha || requireWrapper
      ? [wrapped(name, alpha)]
      : [`var(--${name})`, wrapped(name)],
  ).toContain(actual)
}

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
    expectPaint(style, { '--toned_hover': false }, 'primary')
    expectPaint(style, { '--toned_hover': true }, 'accent', undefined, true)
  })

  test('a different variant carries a different hover', () => {
    const style = styleFor({ variant: 'ghost' })
    expectPaint(style, { '--toned_hover': false }, 'muted')
    expectPaint(style, { '--toned_hover': true }, 'muted', undefined, true)
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
    expectPaint(style, { '--toned_hover': false }, 'primary')
    expectPaint(style, { '--toned_hover': true }, 'primary', '0.9')
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
    expectPaint(style, { '--toned_focus-visible': false }, 'primary')
    expectPaint(
      style,
      { '--toned_focus-visible': true },
      'accent',
      undefined,
      true,
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
    for (const source of [false, true])
      for (const own of [false, true])
        expectPaint(
          icon,
          { '--toned_src-hover': source, '--toned_hover': own },
          own ? 'primary' : source ? 'accent' : 'muted',
          undefined,
          own || source,
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
    expect(cssTestValue(style, 'fontSize', { '--media-md': false })).toBe(
      '1rem',
    )
    expect(cssTestValue(style, 'fontSize', { '--media-md': true })).toBe(
      '0.875rem',
    )
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
    for (const open of [false, true])
      for (const hover of [false, true])
        expectPaint(
          style,
          { '--toned_open': open, '--toned_hover': hover },
          open ? 'primary' : hover ? 'accent' : 'muted',
          undefined,
          open || hover,
        )
  })
})
