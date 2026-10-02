import { defineSystem, defineToken } from '@toned/core'
import { createInlineRenderer } from '@toned/core/server'

const surfaces = {
  canvas: '#f3f4f6',
  card: '#ffffff',
  action: '#2563eb',
} as const

const ui = defineSystem({
  id: 'mail',
  tokens: {
    surface: defineToken({
      values: ['canvas', 'card', 'action'],
      resolve: (value: keyof typeof surfaces) => ({
        backgroundColor: surfaces[value],
      }),
    }),
    ink: defineToken({
      values: ['body', 'inverse'],
      resolve: (value) => ({
        color: value === 'body' ? '#111827' : '#ffffff',
      }),
    }),
    inset: defineToken({
      values: [12, 24],
      resolve: (value) => ({ padding: value }),
    }),
    radius: defineToken({
      values: [8],
      resolve: (value) => ({ borderRadius: value }),
    }),
  },
})

const sheet = ui.stylesheet({
  Body: { surface: 'canvas', ink: 'body', inset: 24 },
  Card: { surface: 'card', inset: 24, radius: 8 },
  Action: { surface: 'action', ink: 'inverse', inset: 12, radius: 8 },
})

/** Concrete inline styles for each part: no stylesheet, classes or variables. */
export const props = createInlineRenderer(ui, { tokens: {} }).resolve(sheet)
