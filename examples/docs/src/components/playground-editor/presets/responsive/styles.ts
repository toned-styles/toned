import { defineSystem, defineToken } from '@toned/core'

// Every value the stylesheet uses is a token of this system. The container
// is declared once; stylesheets query its fixed-pixel thresholds.
export const ui = defineSystem({
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

const { q } = ui

export const planStyles = ui.stylesheet({
  Root: { container: 'panel' },
  Plans: {
    layout: 'stack',
    gap: 2,
    // Side by side once the preview is at least 480px wide.
    [q.container('panel', 'wide')]: { layout: 'row', gap: 4 },
  },
  Plan: {
    $kind: 'pressable',
    layout: 'stack',
    align: 'start',
    grow: 1,
    gap: 2,
    padding: 5,
    radius: 'card',
    tone: 'card',
    cursor: 'pointer',
    // The escape hatch: a one-off, web-only property that no token covers.
    '@platform web': { $style: { transition: 'box-shadow 160ms ease' } },
    // Real :hover and :focus-visible, generated as CSS.
    [q.state('hover')]: { tone: 'raised' },
    [q.state('focus-visible')]: { tone: 'raised' },
  },
  Featured: {
    $kind: 'pressable',
    layout: 'stack',
    align: 'start',
    grow: 1,
    gap: 2,
    padding: 5,
    radius: 'card',
    tone: 'accent',
    cursor: 'pointer',
    [q.state('hover')]: { tone: 'accent-raised' },
    [q.state('focus-visible')]: { tone: 'accent-raised' },
  },
  Name: { $kind: 'text', text: 'name' },
  Price: { $kind: 'text', text: 'price' },
})
