/**
 * States inside variants, css pseudo mode — the pairing a design system's
 * variant table is made of (an outline button's hover is not a ghost button's
 * hover). Proves the whole chain: variants() → flattenRules (`:hover_prop`
 * keys) → exec's pseudoOverrides → var(--toned_hover) fallback chains.
 */
import { describe, expect, test } from 'vitest'
import { defineSystem, defineToken } from '../system/index.ts'
import { SYMBOL_INIT } from '../utils/symbols.ts'

const bgColor = defineToken({
  values: ['primary', 'accent', 'muted'] as const,
  resolve: (value, tokens) => ({ backgroundColor: tokens[value] }),
  alphaChannel: ['backgroundColor'],
})

const system = defineSystem({ bgColor })

const config = {
  getTokens: () => new Proxy({}, { get: (_t, p: string) => `var(--${String(p)})` }),
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
    .variants<{ variant: 'solid' | 'ghost' }>($ => ({
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
    expect(style['--toned_hover__background-color']).toBe('var(--toned_hover) var(--accent)')
    expect(style.backgroundColor).toBe(
      'var(--toned_hover__background-color, var(--primary))',
    )
  })

  test('a different variant carries a different hover', () => {
    const style = styleFor({ variant: 'ghost' })
    expect(style['--toned_hover__background-color']).toBe('var(--toned_hover) var(--muted)')
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
      'var(--toned_hover) rgb(from var(--primary) r g b / 0.9)',
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
      'var(--toned_focus-visible) var(--accent)',
    )
  })
})
