/**
 * System animations on native: the renderer resolves an animated part to
 * its static frame under reduced motion, or hands its keyframes to the
 * motion player, which plays them through the host writer on a fake clock.
 */
import { describe, expect, test } from 'vitest'

import { createNativeRenderer } from '../server/index.ts'
import { recordHostCommit, setStyles } from '../stylesheet/applyStyles.ts'
import {
  type NativeHostAdapter,
  registerNativeHost,
} from '../stylesheet/native-host.ts'
import { animationOf, defineAnimations, defineSystem } from '../system/index.ts'
import {
  attachAnimation,
  createTestClock,
  type ReducedMotionSource,
} from './index.ts'

const motion = defineAnimations(
  {
    rise: {
      keyframes: {
        from: { opacity: 0, translateY: 8 },
        to: { opacity: 1, translateY: 0, scaleX: 2 },
      },
      duration: 100,
      easing: 'linear',
      reducedMotion: 'end',
    },
    breathe: {
      keyframes: { '0%, 100%': { opacity: 1 }, '50%': { opacity: 0.2 } },
      duration: 100,
      easing: 'linear',
      iterations: 'infinite',
      reducedMotion: { at: '50%' },
    },
    status: {
      keyframes: { to: { opacity: 0 } },
      duration: 100,
      easing: 'linear',
      iterations: 'infinite',
      reducedMotion: 'keep',
    },
    tint: {
      keyframes: {
        from: { backgroundColor: '#000000' },
        to: { backgroundColor: '#ffffff' },
      },
      duration: 100,
      easing: 'linear',
      reducedMotion: 'none',
    },
  },
  { durations: { slow: 400 } },
)
const ui = defineSystem({
  id: 'anim-native',
  targets: ['web', 'native'],
  tokens: { ...motion.tokens },
  conditions: { animations: motion.animations },
})
const sheet = ui.stylesheet({
  Rise: { animation: 'rise' },
  Breathe: { animation: 'breathe' },
  Status: { animation: 'status' },
  Tint: { animation: 'tint' },
  Kept: { animation: 'rise', reducedMotion: 'keep' },
  Slow: { animation: 'rise', duration: 'slow', delay: 50 },
})

describe('the native renderer', () => {
  test('under reduced motion, an animated part resolves to its static frame', () => {
    const still = createNativeRenderer(ui, {
      tokens: {},
      reducedMotion: true,
    }).resolve(sheet)
    expect(still.Rise.style).toEqual({
      opacity: 1,
      transform: [{ translateY: 0 }, { scaleX: 2 }],
    })
    expect(still.Breathe.style).toEqual({ opacity: 0.2 })
    // 'none': the element's own style; nothing is left to play.
    expect(still.Tint.style).toEqual({})
    expect(animationOf(still.Tint)).toBeUndefined()
    expect(animationOf(still.Rise)).toBeUndefined()
    // 'keep', by the system or by the part, still plays.
    expect(still.Status.style).toEqual({})
    expect(animationOf(still.Status)?.name).toBe('status')
    expect(animationOf(still.Kept)?.reducedMotion).toBe('keep')
  })

  test('otherwise it writes no CSS animation fields and hands over the keyframes', () => {
    const moving = createNativeRenderer(ui, { tokens: {} }).resolve(sheet)
    expect(moving.Rise.style).toEqual({})
    expect(animationOf(moving.Rise)).toMatchObject({
      name: 'rise',
      duration: 100,
      delay: 0,
      iterations: 1,
      reducedMotion: 'end',
    })
    // A part's timing tokens override the animation's own.
    expect(animationOf(moving.Slow)).toMatchObject({ duration: 400, delay: 50 })
  })
})

/** A native host the test reads back, as motion/native.test.ts builds one. */
function nativeHost(initial: Record<string, unknown>) {
  const style: Record<string, unknown> = { ...initial }
  const adapter: NativeHostAdapter = Object.freeze({
    id: 'toned-test/keyframes',
    renderer: 'custom',
    version: '1',
    accepts: () => true,
    patch: (_host: object, props: Record<string, unknown>) => {
      for (const key of Object.keys(style)) delete style[key]
      Object.assign(style, props['style'])
    },
    resetStyle: () => null,
    resetProp: () => null,
  })
  const host = {}
  registerNativeHost(host, adapter)
  const owner = {}
  recordHostCommit(host, { style: initial }, {}, owner)
  setStyles(host, { style: initial }, owner)
  return { host, style }
}

const moving = createNativeRenderer(ui, { tokens: {} }).resolve(sheet)
const preference = (initial: boolean) => {
  let reduced = initial
  const listeners = new Set<(value: boolean) => void>()
  const source: ReducedMotionSource = {
    current: () => reduced,
    subscribe: (listener) => {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
  }
  return {
    source,
    set(value: boolean) {
      reduced = value
      for (const listener of listeners) listener(value)
    },
  }
}

describe('the motion player', () => {
  test('plays the keyframes through the host writer on the shared clock', () => {
    const clock = createTestClock()
    const f = nativeHost({})
    attachAnimation(f.host, animationOf(moving.Rise)!, { clock })
    expect(f.style).toEqual({
      opacity: 0,
      transform: [{ translateY: 8 }, { scaleX: 1 }],
    })
    clock.advance(48)
    expect(f.style['opacity']).toBeCloseTo(0.48)
    expect(f.style['transform']).toEqual([
      { translateY: 4.16 },
      { scaleX: 1.48 },
    ])
    // A finite animation without a fill mode leaves the committed style: the
    // animated fields are reset through the host adapter.
    clock.advance(100)
    expect(f.style).toEqual({ opacity: null, transform: null })
    expect(clock.pending).toBe(0)
  })

  test('the delay and duration tokens shift and stretch the timeline', () => {
    const clock = createTestClock()
    const f = nativeHost({ opacity: 0.5 })
    attachAnimation(f.host, animationOf(moving.Slow)!, { clock })
    // Before the delay, without a backwards fill: the committed style.
    expect(f.style).toEqual({ opacity: 0.5 })
    clock.advance(256)
    expect(f.style['opacity']).toBeCloseTo((256 - 50) / 400)
  })

  test('an infinite animation loops, interpolating offsets between keyframes', () => {
    const clock = createTestClock()
    const f = nativeHost({})
    attachAnimation(f.host, animationOf(moving.Breathe)!, { clock })
    clock.advance(32)
    expect(f.style['opacity']).toBeCloseTo(1 - 0.8 * (32 / 50))
    clock.advance(96)
    // 128 ms is 28% into the second iteration.
    expect(f.style['opacity']).toBeCloseTo(1 - 0.8 * (28 / 50))
    expect(clock.pending).toBe(1)
  })

  test('colours interpolate as motion interpolates them', () => {
    const clock = createTestClock()
    const f = nativeHost({})
    attachAnimation(f.host, animationOf(moving.Tint)!, { clock })
    clock.advance(48)
    expect(f.style['backgroundColor']).toMatch(/^rgba\(\d+, \d+, \d+, 1\)$/)
  })

  test('reduced motion rests on the static frame and stops the clock, except keep', () => {
    const clock = createTestClock()
    const reduced = preference(false)
    const f = nativeHost({})
    attachAnimation(f.host, animationOf(moving.Breathe)!, {
      clock,
      reducedMotion: reduced.source,
    })
    clock.advance(16)
    reduced.set(true)
    expect(f.style).toEqual({ opacity: 0.2 })
    expect(clock.pending).toBe(0)
    reduced.set(false)
    expect(clock.pending).toBe(1)

    const g = nativeHost({})
    attachAnimation(g.host, animationOf(moving.Status)!, {
      clock,
      reducedMotion: true,
    })
    clock.advance(48)
    // Attached at 16 ms, so 48 ms into its timeline.
    expect(g.style['opacity']).toBeCloseTo(1 - 48 / 100)
  })

  test('a keyframe property native cannot animate is diagnosed', () => {
    const web = defineAnimations({
      shimmer: {
        keyframes: { to: { boxShadow: '0 0 4px red' } },
        reducedMotion: 'none',
      },
    })
    const site = defineSystem({
      id: 'anim-native-web',
      tokens: { ...web.tokens },
      conditions: { animations: web.animations },
    })
    const props = createNativeRenderer(site, { tokens: {} }).resolve(
      site.stylesheet({ Root: { animation: 'shimmer' } }),
    )
    expect(() =>
      attachAnimation(nativeHost({}).host, animationOf(props.Root)!),
    ).toThrow(
      "[toned/motion] animation 'shimmer' animates boxShadow, which native cannot animate; native animates opacity, lengths, colours and translateX/translateY/rotate/scale",
    )
  })
})
