import { describe, expect, it } from 'vitest'
import { createPdfRenderer } from '../server/index.ts'
import { defineSystem, defineToken } from '../system/definers.ts'
import { pdfBackend } from './pdf.ts'

describe('PDF backend', () => {
  it('preserves fractional point values, percentages and PDF text decoration', () => {
    const ui = defineSystem({
      body: defineToken({
        values: ['report'],
        resolve: () => ({
          fontSize: 9.5,
          padding: 36,
          width: '50%',
          textDecoration: 'underline',
        }),
      }),
    })
    const props = createPdfRenderer(ui, { tokens: {} }).resolve(
      ui.stylesheet({ Body: { body: 'report' } }),
    ).Body
    expect(props).toEqual({
      style: {
        fontSize: 9.5,
        padding: 36,
        width: '50%',
        textDecoration: 'underline',
      },
    })
    expect(Object.isFrozen(props.style)).toBe(true)
  })
  it('rejects CSS, native-only fields and unsupported document layout values', () => {
    for (const style of [
      { width: '2rem' },
      { width: 'calc(100% - 8px)' },
      { color: 'var(--ink)' },
      { fontSize: Infinity },
      { shadowOffset: { width: 1, height: 2 } },
      { gridTemplateColumns: '1fr 1fr' },
      { display: 'grid' },
      { textDecorationLine: 'underline' },
    ])
      expect(() => pdfBackend.resolve({ style })).toThrow(/PDF backend/)
  })
  it('rejects inactive browser branches before resolution', () => {
    const ui = defineSystem(
      {
        opacity: defineToken({
          values: [0, 1],
          resolve: (opacity) => ({ opacity }),
        }),
      },
      { media: { wide: 800 } },
    )
    const renderer = createPdfRenderer(ui, { tokens: {} })
    expect(() =>
      renderer.resolve(ui.stylesheet({ Body: { '@wide': { opacity: 0 } } })),
    ).toThrow(/condition/)
    expect(() =>
      renderer.resolve(ui.stylesheet({ Body: { ':hover': { opacity: 0 } } })),
    ).toThrow(/condition/)
  })
})
