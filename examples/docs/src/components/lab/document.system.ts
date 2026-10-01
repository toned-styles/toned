import { defineSystem, defineToken } from '@toned/core'

export const documentSystem = defineSystem({
  id: 'lab-document',
  tokens: {
    padding: defineToken({
      values: [16, 24] as const,
      resolve: (value) => ({ padding: value }),
    }),
    surface: defineToken({
      values: ['tint'] as const,
      resolve: () => ({ backgroundColor: '#eef2ff' }),
    }),
    radius: defineToken({
      values: [12] as const,
      resolve: (value) => ({ borderRadius: value }),
    }),
    text: defineToken({
      values: ['body'] as const,
      resolve: () => ({ color: '#182554', fontSize: 16 }),
    }),
  },
})

export const { stylesheet } = documentSystem
