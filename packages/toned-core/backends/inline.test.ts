import { describe, expect, it } from 'vitest'
import { createInlineRenderer } from '../server/index.ts'
import { defineSystem, defineToken } from '../system/definers.ts'
import type { Variants } from '../types/stylesheet.ts'

describe('inline document renderer', () => {
  const ui = defineSystem(
    {
      inset: defineToken({
        values: [0, 12],
        resolve: (value) => ({ padding: value }),
      }),
      ink: defineToken({
        values: ['body'],
        resolve: (_value, tokens) => ({ color: tokens['ink'] }),
      }),
    },
    { media: { md: 768 }, containers: { card: { wide: 400 } } },
  )

  it('resolves literal complete props without CSS assets or ambient configuration', () => {
    const tokens = { ink: '#123456' }
    const renderer = createInlineRenderer(ui, { tokens })
    tokens.ink = '#abcdef'
    const sheet = ui.stylesheet({ Body: { inset: 12, ink: 'body' } })
    expect(renderer.resolve(sheet)).toEqual({
      Body: { style: { padding: 12, color: '#123456' } },
    })
    expect(renderer.t({ inset: 12 }).style).toEqual({ padding: 12 })
    expect(renderer.resolve(sheet).Body).not.toHaveProperty('className')
  })

  it('keeps explicit variants and target platform selection', () => {
    const sheet = ui
      .stylesheet({ Body: { inset: 0, '@platform web': { ink: 'body' } } })
      .variants(($: Variants<{ mode: 'padded' | 'plain' }>) => ({
        [$.mode('padded')]: { Body: { inset: 12 } },
      }))
    expect(
      createInlineRenderer(ui, { tokens: { ink: 'navy' } }).resolve(sheet, {
        variants: { mode: 'padded' },
      }).Body.style,
    ).toEqual({ padding: 12, color: 'navy' })
  })

  it('rejects browser conditions before an inactive branch can silently disappear', () => {
    const renderer = createInlineRenderer(ui, { tokens: {} })
    for (const sheet of [
      ui.stylesheet({ Body: { inset: 0, ':hover': { inset: 12 } } }),
      ui.stylesheet({ Body: { inset: 0, '@md': { inset: 12 } } }),
      ui.stylesheet({
        Body: { inset: 0, '@container card wide': { inset: 12 } },
      }),
    ]) {
      expect(() => renderer.resolve(sheet)).toThrow(/inline.*condition/i)
    }
  })

  it('rejects CSS variables and non-finite values in sheet and composer paths', () => {
    for (const color of ['var(--ink)', 'rgb(var(--rgb))']) {
      const renderer = createInlineRenderer(ui, { tokens: { ink: color } })
      expect(() =>
        renderer.resolve(ui.stylesheet({ Body: { ink: 'body' } })),
      ).toThrow(/literal/i)
      expect(() => renderer.t({ ink: 'body' }).style).toThrow(/literal/i)
    }
    const renderer = createInlineRenderer(ui, { tokens: {} })
    expect(() => renderer.t({ $style: { opacity: Number.NaN } }).style).toThrow(
      /finite/i,
    )
    expect(() => renderer.t({ $style: { opacity: Infinity } }).style).toThrow(
      /finite/i,
    )
  })
})
