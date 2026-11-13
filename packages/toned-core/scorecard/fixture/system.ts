/**
 * The scorecard's fixture system: a small, self-contained descriptor system
 * with every vocabulary the corpus and suites exercise. Tokens have finite
 * scales, one named media threshold (`md`), one declared state (`open`), one
 * bridge (`placeholder`) and one application-owned CSS variable. It is
 * namespaced (`id`), so an unlisted `var()` is renamed, as in a real app.
 */
import { defineSystem, defineToken } from '../../index.ts'

const palette = {
  surface: 'var(--app-surface)',
  accent: '#2563eb',
  muted: '#6b7280',
} as const
type Paint = keyof typeof palette

export const gap = defineToken({
  values: [0, 1, 2, 4] as const,
  resolve: (value) => ({ gap: value * 4 }),
})
export const padding = defineToken({
  values: [0, 1, 2, 4] as const,
  resolve: (value) => ({ padding: value * 4 }),
})
export const opacity = defineToken({
  values: [0, 0.5, 1] as const,
  resolve: (value) => ({ opacity: value }),
})
export const bgColor = defineToken({
  values: ['surface', 'accent', 'muted'] as const,
  resolve: (value: Paint) => ({ backgroundColor: palette[value] }),
})
export const textColor = defineToken({
  values: ['surface', 'accent', 'muted'] as const,
  resolve: (value: Paint) => ({ color: palette[value] }),
})

export const ui = defineSystem({
  id: 'scorecard',
  externalCssVariables: ['--app-surface'],
  tokens: { gap, padding, opacity, bgColor, textColor },
  conditions: {
    media: { md: 768 },
    states: { open: "[data-state='open']" },
    bridges: {
      placeholder: { selector: '::placeholder', properties: ['color'] },
    },
  },
})
