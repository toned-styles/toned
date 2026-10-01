// The configuration layer: a design system of your own. Every value the
// stylesheet uses is a token of this system. The container is declared once,
// under `conditions`; stylesheets query its fixed-pixel thresholds with `q`.
import { defineSystem, defineToken } from '@toned/core'

export type { Variants } from '@toned/core'

export const system = defineSystem({
  id: 'responsive-demo',
  tokens: {
    // A size container measures itself, so it needs a definite width.
    container: defineToken({
      values: ['panel'] as const,
      resolve: (name) => ({
        width: '100%',
        containerType: 'inline-size',
        containerName: name,
      }),
    }),
    layout: defineToken({
      values: ['stack', 'row'] as const,
      resolve: (value) => ({
        display: 'flex',
        flexDirection: value === 'row' ? 'row' : 'column',
      }),
    }),
    align: defineToken({
      values: ['start', 'stretch'] as const,
      resolve: (value) => ({
        alignItems: value === 'start' ? 'flex-start' : 'stretch',
      }),
    }),
    grow: defineToken({
      values: [0, 1] as const,
      resolve: (flexGrow) => ({ flexGrow }),
    }),
    gap: defineToken({
      values: [2, 3, 4] as const,
      resolve: (step) => ({ gap: step * 4 }),
    }),
    padding: defineToken({
      values: [3, 5] as const,
      resolve: (step) => ({ padding: step * 4 }),
    }),
    radius: defineToken({
      values: ['card'] as const,
      resolve: () => ({ borderRadius: 14 }),
    }),
    tone: defineToken({
      values: ['card', 'raised', 'accent', 'accent-raised'] as const,
      resolve: (value) => {
        const accent = value.startsWith('accent')
        const raised = value.endsWith('raised')
        return {
          backgroundColor: accent ? '#284bdd' : '#ffffff',
          color: accent ? '#ffffff' : '#17234b',
          boxShadow: raised ? '0 12px 32px #17234b24' : '0 1px 2px #17234b14',
        }
      },
    }),
    text: defineToken({
      values: ['name', 'price'] as const,
      resolve: (value) => ({
        fontSize: value === 'price' ? 28 : 13,
        fontWeight: value === 'price' ? '700' : '600',
      }),
    }),
    cursor: defineToken({
      values: ['pointer'] as const,
      resolve: (cursor) => ({ cursor }),
    }),
  },
  conditions: { containers: { panel: { wide: 480 } } },
})

export const { stylesheet, q } = system
