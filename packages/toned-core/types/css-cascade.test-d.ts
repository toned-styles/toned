import type { Properties } from 'csstype'

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
// cannot split `animation: none`. The fix is the token's own stop.
const motion = defineAnimations({
  'fade-in': {
    keyframes: { from: { opacity: 0 }, to: { opacity: 1 } },
    duration: 200,
    reducedMotion: 'end',
  },
})
const animated = defineSystem({
  id: 'animated',
  tokens: { gap, ...motion.tokens },
  conditions: {
    animations: motion.animations,
    states: { open: '[data-open]' },
  },
})

animated.stylesheet({
  Root: {
    animation: 'fade-in',
    ':open': { animation: 'none' },
  },
})
animated.stylesheet({
  Root: {
    animation: 'fade-in',
    // @ts-expect-error — `animation: 'none'` under a condition beside the token
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
  "Toned: 'animation' in $style and the longhand 'animationName' a token writes are set under different conditions; outside its condition the conditional one reverts the other. Write the longhand in $style instead of 'animation' (to stop an animation, write the animation token's animation: 'none')"
void message

// A token whose `resolve` is typed loosely (a whole `CSSProperties`, as a
// system's published declaration types it) names no field it always writes,
// so a shorthand beside it is not a conflict: only the keys a result type
// requires count.
const flexLayout = defineToken({
  values: ['column', 'row'] as const,
  resolve: (value): Properties => ({
    display: 'flex',
    flexDirection: value,
  }),
})
const loose = defineSystem({
  id: 'loose',
  tokens: { flexLayout },
  conditions: { media: { md: 768 } },
})
loose.stylesheet({
  Root: {
    flexLayout: 'column',
    '@platform web': { $style: { gap: '0.5rem', padding: '0.5rem' } },
    '@md': { '@platform web': { $style: { padding: '0.75rem' } } },
  },
})

// A token that writes a shorthand (`borderColor`, the four side colours) beside
// a conditional `$style` shorthand sharing a longhand with it (`borderTop`
// carries `borderTopColor`) conflicts too: the runtime cannot split them.
const borderColor = defineToken({
  values: ['line'] as const,
  resolve: () => ({ borderColor: 'gray' }),
})
const bordered = defineSystem({
  id: 'bordered',
  tokens: { borderColor },
  conditions: { states: { open: '[data-open]' } },
})
bordered.stylesheet({
  Root: {
    borderColor: 'line',
    ':open': { '@platform web': { $style: { borderTopWidth: '2px' } } },
  },
})
bordered.stylesheet({
  // @ts-expect-error — `borderTop` under a condition beside the `borderColor` token
  Root: {
    borderColor: 'line',
    ':open': { '@platform web': { $style: { borderTop: '1px solid red' } } },
  },
})

// The same shorthand on both sides is no conflict: a token writing
// `borderRadius` and a conditional `$style` `borderRadius` set one property,
// whichever wins. Only a different shorthand sharing a longhand conflicts.
const radius = defineToken({
  values: ['2xl'] as const,
  resolve: () => ({ borderRadius: '1rem' }),
})
const rounded = defineSystem({
  id: 'rounded',
  tokens: { radius, borderColor },
  conditions: { media: { md: 768 }, states: { open: '[data-open]' } },
})
rounded.stylesheet({
  Root: {
    radius: '2xl',
    '@md': { '@platform web': { $style: { borderRadius: '1.5rem' } } },
  },
})
rounded.stylesheet({
  Root: {
    borderColor: 'line',
    ':open': { '@platform web': { $style: { borderColor: 'red' } } },
  },
})
