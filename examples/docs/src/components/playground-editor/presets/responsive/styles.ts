import { q, stylesheet } from './system.ts'

// `q` builds condition keys from what the system declares: its `panel`
// container and the pointer states.
export const planStyles = stylesheet({
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
