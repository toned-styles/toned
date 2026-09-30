import { defineSystem, defineToken } from '@toned/core'

// Declare the container once. Stylesheets query its fixed-pixel thresholds.
export const ui = defineSystem({
  id: 'responsive-demo',
  tokens: {
    layout: defineToken({
      values: ['stack', 'row'] as const,
      resolve: (value) => ({
        display: 'flex',
        flexDirection: value === 'row' ? 'row' : 'column',
      }),
    }),
    gap: defineToken({
      values: [8, 12, 16] as const,
      resolve: (gap) => ({ gap }),
    }),
    tone: defineToken({
      values: ['card', 'raised', 'accent'] as const,
      resolve: (value) => ({
        backgroundColor: value === 'accent' ? '#284bdd' : '#ffffff',
        color: value === 'accent' ? '#ffffff' : '#17234b',
        boxShadow:
          value === 'raised' ? '0 12px 32px #17234b24' : '0 1px 2px #17234b14',
      }),
    }),
  },
  conditions: { containers: { panel: { wide: 480 } } },
})

const { q } = ui

export const planStyles = ui.stylesheet({
  Root: {
    // A size container measures itself, so it needs a definite width.
    $style: { width: '100%' },
    '@platform web': {
      $style: { containerType: 'inline-size', containerName: 'panel' },
    },
  },
  Plans: {
    layout: 'stack',
    gap: 8,
    // Side by side once the preview is at least 480px wide.
    [q.container('panel', 'wide')]: { layout: 'row', gap: 16 },
  },
  Plan: {
    $kind: 'pressable',
    layout: 'stack',
    gap: 8,
    tone: 'card',
    $style: {
      flexGrow: 1,
      alignItems: 'flex-start',
      padding: 20,
      borderRadius: 14,
    },
    '@platform web': {
      $style: { cursor: 'pointer', transition: 'box-shadow 160ms ease' },
    },
    // Real :hover and :focus-visible, generated as CSS.
    [q.state('hover')]: { tone: 'raised' },
    [q.state('focus-visible')]: { tone: 'raised' },
  },
  Featured: {
    $kind: 'pressable',
    layout: 'stack',
    gap: 8,
    tone: 'accent',
    $style: {
      flexGrow: 1,
      alignItems: 'flex-start',
      padding: 20,
      borderRadius: 14,
    },
    '@platform web': { $style: { cursor: 'pointer' } },
    [q.state('hover')]: { $style: { opacity: 0.9 } },
  },
  Name: { $kind: 'text', $style: { fontSize: 13, fontWeight: '600' } },
  Price: { $kind: 'text', $style: { fontSize: 28, fontWeight: '700' } },
})
