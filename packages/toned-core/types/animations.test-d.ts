/**
 * Compile-time contracts for system animations: every animation says what
 * reduced motion does with it, `{ at }` names one of its own keyframe
 * offsets, a system rendered on native animates only what native can, and a
 * system that declares animations refuses the raw CSS spellings. `tsc` is the
 * test: every `@ts-expect-error` fails the build if its error disappears.
 */
import { defineAnimations, defineSystem } from '../system/index.ts'
import type { TonedError } from './errors.ts'
import type {
  AnimationKeyframeOffset,
  NativeKeyframeError,
  RawAnimationStyle,
} from './tokens.ts'

// --- reducedMotion is required ---------------------------------------------------

const motion = defineAnimations(
  {
    pulse: {
      keyframes: { '50%': { opacity: 0.5 } },
      duration: 2000,
      iterations: 'infinite',
      reducedMotion: 'none',
    },
    fade: {
      keyframes: { from: { opacity: 0 }, to: { opacity: 1 } },
      duration: 200,
      fillMode: 'both',
      reducedMotion: 'end',
    },
    glow: {
      keyframes: {
        '0%, 100%': { boxShadow: '0 0 4px red' },
        '50%': { boxShadow: '0 0 8px red' },
      },
      reducedMotion: { at: '50%' },
    },
    status: {
      keyframes: { '75%, 100%': { opacity: 0 } },
      reducedMotion: 'keep',
    },
  },
  {
    durations: { fast: 150, slow: 400 },
    easings: { emphasized: 'cubic-bezier(0.2, 0, 0, 1)' },
  },
)

// @ts-expect-error — an animation without reducedMotion
defineAnimations({ bare: { keyframes: { to: { opacity: 1 } }, duration: 100 } })

// @ts-expect-error — a bare keyframes record has no reducedMotion either
defineAnimations({ bare: { to: { opacity: 1 } } })

defineAnimations({
  // @ts-expect-error — a reducedMotion value that is not a mode
  wrong: { keyframes: { to: { opacity: 1 } }, reducedMotion: 'stop' },
})

// --- { at } names a keyframe offset of the same animation ----------------------

defineAnimations({
  // `from` and `to` are offsets too.
  a: { keyframes: { from: { opacity: 0 } }, reducedMotion: { at: '0%' } },
  c: {
    keyframes: { '25%, 75%': { opacity: 0 } },
    reducedMotion: { at: '75%' },
  },
})
defineAnimations({
  // @ts-expect-error — 30% is not one of the animation's keyframe offsets
  d: { keyframes: { '50%': { opacity: 0 } }, reducedMotion: { at: '30%' } },
})
defineAnimations({
  // @ts-expect-error — nor is an end the keyframes leave implicit
  e: { keyframes: { '50%': { opacity: 0 } }, reducedMotion: { at: '100%' } },
})

const offsets: AnimationKeyframeOffset<{
  '0%, 100%': object
  '50%': object
  from: object
}>[] = ['0%', '50%', '100%']
void offsets

// --- a part composes the tokens -------------------------------------------------

const ui = defineSystem({
  id: 'animation-types',
  tokens: { ...motion.tokens },
  conditions: {
    animations: motion.animations,
    states: { open: '[data-open]' },
  },
})

ui.stylesheet({
  Root: {
    animation: 'fade',
    duration: 'slow',
    easing: 'emphasized',
    delay: 120,
  },
  Ping: { animation: 'pulse', reducedMotion: 'keep' },
  Halo: { animation: 'glow', reducedMotion: { at: '100%' } },
  // `animation: 'none'` is the token's stop.
  Still: { animation: 'pulse', ':open': { animation: 'none' } },
  Timed: { animation: 'fade', duration: 90, easing: 'linear', delay: 'fast' },
})

ui.stylesheet({
  // @ts-expect-error — an animation the system does not declare
  Root: { animation: 'spin' },
})
ui.stylesheet({
  // @ts-expect-error — a duration the system does not name
  Root: { animation: 'fade', duration: 'glacial' },
})
ui.stylesheet({
  // @ts-expect-error — reducedMotion takes a mode, not a CSS keyword
  Root: { animation: 'fade', reducedMotion: 'reduce' },
})

// --- one spelling: the raw CSS animation fields are refused ------------------------

ui.stylesheet({
  // @ts-expect-error — raw animationName in a system that declares animations
  Root: { '@platform web': { $style: { animationName: 'pulse' } } },
})
ui.stylesheet({
  // @ts-expect-error — the animation shorthand, likewise
  Root: { '@platform web': { $style: { animation: 'pulse 2s infinite' } } },
})
ui.stylesheet({
  // Timing longhands stay available in $style.
  Root: {
    animation: 'fade',
    '@platform web': { $style: { animationPlayState: 'paused' } },
  },
})

// The refusal names the token form.
const named: RawAnimationStyle['animationName'] =
  undefined as unknown as TonedError<"Toned: this system declares its animations; write the animation token (animation: '<name>', or animation: 'none' to stop) instead of a raw animationName">
void named

// A system without animations keeps raw CSS animation.
const plain = defineSystem({ id: 'animation-plain', tokens: {} })
plain.stylesheet({
  Root: { '@platform web': { $style: { animationName: 'spin' } } },
})

// --- native targets animate only the portable vocabulary --------------------------

const portable = defineAnimations({
  rise: {
    keyframes: {
      from: { opacity: 0, translateY: 8, backgroundColor: '#ffffff' },
      to: { opacity: 1, translateY: 0, scale: 1 },
    },
    duration: 200,
    reducedMotion: 'end',
  },
})
defineSystem({
  id: 'animation-native',
  targets: ['web', 'native'],
  tokens: { ...portable.tokens },
  conditions: { animations: portable.animations },
})

const webOnly = defineAnimations({
  shimmer: {
    keyframes: { to: { boxShadow: '0 0 8px red', transform: 'scale(2)' } },
    reducedMotion: 'none',
  },
})
// A web-only system keeps full CSS keyframes.
defineSystem({
  id: 'animation-web',
  targets: ['web'],
  tokens: { ...webOnly.tokens },
  conditions: { animations: webOnly.animations },
})
defineSystem({
  id: 'animation-native-bad',
  targets: ['web', 'native'],
  tokens: { ...webOnly.tokens },
  // @ts-expect-error — boxShadow and transform cannot animate on native
  conditions: { animations: webOnly.animations },
})

// The native refusal names the property.
const nativeMessage: NativeKeyframeError<'boxShadow'> =
  undefined as unknown as TonedError<"Toned: keyframe property 'boxShadow' cannot animate on native, and this system targets native; animate opacity, a length, a colour or translateX/translateY/rotate/scale, or keep the animation in a web-only system">
void nativeMessage
