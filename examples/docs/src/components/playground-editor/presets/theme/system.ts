// The configuration layer: a design system of your own. Every value a
// stylesheet may use is declared here; `styles.ts` imports `stylesheet`.
import { defineSystem, defineToken } from '@toned/core'

export type { Variants } from '@toned/core'

const palettes = {
  daylight: {
    canvas: '#f4f6ff',
    card: '#ffffff',
    ink: '#17234b',
    accent: '#284bdd',
  },
  midnight: {
    canvas: '#0e1430',
    card: '#18213c',
    ink: '#f4f6ff',
    accent: '#8fa6ff',
  },
  meadow: {
    canvas: '#eef7f0',
    card: '#ffffff',
    ink: '#16352a',
    accent: '#1d7a4c',
  },
} as const

export type Theme = keyof typeof palettes

export const system = defineSystem({
  id: 'my-theme',
  tokens: {
    theme: defineToken({
      values: ['daylight', 'midnight', 'meadow'] as const,
      resolve: (name: Theme) => ({
        '--canvas': palettes[name].canvas,
        '--card': palettes[name].card,
        '--ink': palettes[name].ink,
        '--accent': palettes[name].accent,
      }),
    }),
    surface: defineToken({
      values: ['canvas', 'card', 'accent'] as const,
      resolve: (value) => ({ backgroundColor: `var(--${value})` }),
    }),
    ink: defineToken({
      values: ['default', 'accent', 'inverse'] as const,
      resolve: (value: 'default' | 'accent' | 'inverse') => ({
        color: {
          default: 'var(--ink)',
          accent: 'var(--accent)',
          inverse: 'var(--card)',
        }[value],
      }),
    }),
    space: defineToken({
      values: [2, 3, 4, 6] as const,
      resolve: (step) => ({ padding: step * 4 }),
    }),
    stack: defineToken({
      values: [1, 2, 4] as const,
      resolve: (step) => ({
        display: 'flex',
        flexDirection: 'column',
        gap: step * 4,
      }),
    }),
    radius: defineToken({
      values: ['soft', 'pill'] as const,
      resolve: (value) => ({ borderRadius: value === 'soft' ? 16 : 999 }),
    }),
    text: defineToken({
      values: ['title', 'body', 'caption'] as const,
      resolve: (value: 'title' | 'body' | 'caption') => ({
        fontSize: { title: 22, body: 15, caption: 12 }[value],
        fontWeight: value === 'title' ? 700 : 500,
      }),
    }),
  },
})

export const { stylesheet } = system
