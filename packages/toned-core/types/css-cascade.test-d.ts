/**
 * Compile-time contracts for what a condition cannot carry on the web: a
 * shorthand in one condition beside its longhand in another, and a CSS-wide
 * keyword under a condition. `tsc` is the test: every `@ts-expect-error`
 * fails the build if its error disappears.
 */
import { defineSystem, defineToken } from '../system/index.ts'

const gap = defineToken({
  values: [1, 2] as const,
  resolve: (value) => ({ gap: value }),
})
const ui = defineSystem({
  id: 'cascade',
  tokens: { gap },
  conditions: { media: { md: 768 }, states: { open: '[data-open]' } },
})

// --- accepted ------------------------------------------------------------------

ui.stylesheet((q) => ({
  Root: {
    '@platform web': { $style: { transition: 'opacity 200ms' } },
    // The whole shorthand again under a condition.
    [q.state('open')]: {
      '@platform web': { $style: { transition: 'transform 1s' } },
    },
  },
  Label: {
    // A shorthand and its longhand in one block are one static pair.
    '@platform web': {
      $style: { transition: 'opacity 200ms', transitionDelay: '50ms' },
    },
  },
  Item: {
    // Keywords at rest are the chain's fallback, where they work.
    '@platform web': { $style: { backgroundColor: 'inherit' } },
    ':hover': { '@platform web': { $style: { backgroundColor: 'red' } } },
  },
}))

// --- a shorthand and its longhand under different conditions -------------------

// @ts-expect-error — `transitionProperty` under a condition beside `transition`
ui.stylesheet((q) => ({
  Root: {
    '@platform web': { $style: { transition: 'opacity 200ms ease' } },
    [q.state('open')]: {
      '@platform web': { $style: { transitionProperty: 'transform' } },
    },
  },
}))
ui.stylesheet({
  // @ts-expect-error — a conditional shorthand beside a resting longhand
  Root: {
    '@platform web': { $style: { overflowY: 'auto' } },
    '@md': { '@platform web': { $style: { overflow: 'hidden' } } },
  },
})

// --- a CSS-wide keyword under a condition --------------------------------------

ui.stylesheet({
  // @ts-expect-error — `inherit` cannot pass through a condition's chain
  Root: {
    ':hover': { '@platform web': { $style: { backgroundColor: 'inherit' } } },
  },
})
