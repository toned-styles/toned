import { describe, expect, it } from 'vitest'

import { buildStyles } from '../../build/index.ts'
import { createWebRenderer } from '../../server/index.ts'
import { defineSystem, defineToken } from '../../system/definers.ts'

const ui = defineSystem({
  id: 'mc',
  tokens: {
    gap: defineToken({ values: [4, 8], resolve: (gap: number) => ({ gap }) }),
  },
  conditions: {
    media: { md: 768, motionless: '(prefers-reduced-motion: reduce)' },
  },
})

describe('named media conditions', () => {
  it('a parenthesised media query is a named condition beside the widths, toggled by the build', () => {
    const artifact = buildStyles(ui, { sheets: [] })
    expect(artifact.css).toContain(
      '@media (prefers-reduced-motion: reduce) { html { --mc-media-motionless: ; --mc-media-motionless-not: initial; } }',
    )
    expect(artifact.css).toContain('@media (min-width: 768px)')
    const sheet = ui.stylesheet({
      Root: { gap: 4, '@motionless': { gap: 8 } },
    })
    const style = createWebRenderer(ui, {
      tokens: {},
      manifest: artifact.manifest,
    }).resolve(sheet).Root.style
    expect(JSON.stringify(style)).toContain('var(--mc-media-motionless)')
  })

  it('a query led by a media type, such as print, is a named condition too', () => {
    const paged = defineSystem({
      id: 'mp',
      tokens: {
        gap: defineToken({
          values: [4, 8],
          resolve: (gap: number) => ({ gap }),
        }),
      },
      conditions: {
        media: { print: 'print', wide: 'screen and (min-width: 64rem)' },
      },
    })
    const artifact = buildStyles(paged, { sheets: [] })
    expect(artifact.css).toContain(
      '@media print { html { --mp-media-print: ; --mp-media-print-not: initial; } }',
    )
    expect(artifact.css).toContain(
      '@media screen and (min-width: 64rem) { html {',
    )
    const sheet = paged.stylesheet({ Root: { gap: 4, '@print': { gap: 8 } } })
    const style = createWebRenderer(paged, {
      tokens: {},
      manifest: artifact.manifest,
    }).resolve(sheet).Root.style
    expect(JSON.stringify(style)).toContain('var(--mp-media-print)')
  })

  it('still refuses a length that is not a fixed threshold', () => {
    expect(() =>
      defineSystem({
        id: 'mc-rem',
        tokens: {},
        conditions: { media: { md: '48rem' as never } },
      }),
    ).toThrow(/fixed nonnegative logical-pixel threshold/)
  })
})
