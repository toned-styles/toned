import type { Styles } from '@react-pdf/renderer'
import { defineSystem, defineToken } from '@toned/core'
import { createPdfRenderer } from '@toned/core/server'

const ui = defineSystem({
  id: 'report',
  tokens: {
    inset: defineToken({
      values: [12, 24, 36],
      resolve: (value) => ({ padding: value }),
    }),
    surface: defineToken({
      values: ['card', 'action'],
      resolve: (value) => ({
        backgroundColor: value === 'card' ? '#f3f4f6' : '#2563eb',
      }),
    }),
    ink: defineToken({
      values: ['body', 'inverse'],
      resolve: (value) => ({
        color: value === 'body' ? '#111827' : '#ffffff',
      }),
    }),
    type: defineToken({
      values: ['body', 'action'],
      resolve: (value) => ({
        fontSize: value === 'body' ? 12 : 14,
        fontFamily: 'Helvetica',
      }),
    }),
    spaceAfter: defineToken({
      values: [12],
      resolve: (value) => ({ marginBottom: value }),
    }),
  },
})

const sheet = ui.stylesheet({
  Page: { inset: 36, ink: 'body', type: 'body' },
  Card: { surface: 'card', inset: 24 },
  Action: { surface: 'action', ink: 'inverse', inset: 12, spaceAfter: 12 },
  ActionLabel: { $kind: 'text', type: 'action' },
})

const resolved = createPdfRenderer(ui, { tokens: {} }).resolve(sheet)

/**
 * Point-based props for each part. The PDF renderer has already checked every
 * field and value against its profile; the assertion only gives the result
 * React PDF's style type.
 */
export const props = resolved as {
  readonly [Part in keyof typeof resolved]: { readonly style: Styles[string] }
}
