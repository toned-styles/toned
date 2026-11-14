/**
 * Compile-time contracts for what a condition cannot carry on the web: a
 * shorthand in one condition beside its longhand in another, and a CSS-wide
 * keyword under a condition. `tsc` is the test: every `@ts-expect-error`
 * fails the build if its error disappears.
 */
import { defineAnimations, defineSystem, defineToken } from '../system/index.ts'
import type { TokenSystem } from '../system/index.ts'
import type { PartCascadeCheck } from './cascade.ts'

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

// --- a token's longhand beside a raw shorthand under another condition ---------

// The `animation` token writes `animationName` (and its timing longhands); a
// raw `animation` under a condition reverts them outside it, and the runtime
// cannot split `animation: none`. The fix is the longhand.
const motion = defineAnimations({
  'fade-in': {
    keyframes: { from: { opacity: 0 }, to: { opacity: 1 } },
    duration: 200,
  },
})
const animated = defineSystem({
  id: 'animated',
  tokens: { gap, animation: motion.animation },
  conditions: {
    animations: motion.animations,
    states: { open: '[data-open]' },
  },
})

animated.stylesheet({
  Root: {
    animation: 'fade-in',
    ':open': { '@platform web': { $style: { animationName: 'none' } } },
  },
})
animated.stylesheet({
  // @ts-expect-error — `animation: 'none'` under a condition beside the token
  Root: {
    animation: 'fade-in',
    ':open': { '@platform web': { $style: { animation: 'none' } } },
  },
})

type Declaration = typeof animated extends TokenSystem<infer S> ? S : never
type Messages = keyof PartCascadeCheck<
  {
    animation: 'fade-in'
    ':open': { '@platform web': { $style: { animation: 'none' } } }
  },
  Declaration
>
const message: Messages =
  "Toned: 'animation' in $style and the longhand 'animationName' a token writes are set under different conditions; outside its condition the conditional one reverts the other. Write the longhand in $style instead of 'animation' (for animation: 'none', write animationName: 'none')"
void message
