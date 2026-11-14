import { describe, expect, test } from 'vitest'

import { recordHostCommit, setStyles } from '../stylesheet/applyStyles.ts'
import {
  type NativeHostAdapter,
  registerNativeHost,
} from '../stylesheet/native-host.ts'
import { defineSystem, defineToken } from '../system/index.ts'
import { attachMotion, createTestClock, defineMotion } from './index.ts'

const opacity = defineToken({
  values: [0, 1] as const,
  resolve: (value) => ({ opacity: value }),
})
const ui = defineSystem({
  id: 'motion-native',
  tokens: { opacity },
  conditions: {
    states: { open: "[data-state='open']", saving: '[data-saving]' },
  },
})

/** A native host whose semantic states the test sets, as a Weft binding would. */
function nativeHost(initial: Record<string, unknown>) {
  const style: Record<string, unknown> = { ...initial }
  const facts = new Set<string>()
  const listeners = new Set<() => void>()
  const adapter: NativeHostAdapter = Object.freeze({
    id: 'toned-test/motion-states',
    renderer: 'custom',
    version: '1',
    accepts: () => true,
    readState: (_host: object, name: string) => facts.has(name),
    subscribeState: (notify: () => void) => {
      listeners.add(notify)
      return () => listeners.delete(notify)
    },
    patch: (_host: object, props: Record<string, unknown>) =>
      Object.assign(style, props['style']),
    resetStyle: () => null,
    resetProp: () => null,
  })
  const host = {}
  registerNativeHost(host, adapter)
  const owner = {}
  recordHostCommit(host, { style: initial }, {}, owner)
  setStyles(host, { style: initial }, owner)
  return {
    host,
    style,
    listeners,
    set(...names: string[]) {
      facts.clear()
      for (const name of names) facts.add(name)
    },
    commit(next: Record<string, unknown>) {
      setStyles(host, { style: next }, owner)
    },
  }
}

describe('colour targets', () => {
  test('a committed colour change interpolates in oklab', () => {
    const clock = createTestClock()
    const f = nativeHost({ backgroundColor: '#000000' })
    attachMotion(
      f.host,
      {
        properties: ['backgroundColor'],
        transition: { type: 'timing', duration: 100 },
      },
      { clock },
    )
    f.commit({ backgroundColor: '#ffffff' })
    expect(f.style['backgroundColor']).toBe('rgba(0, 0, 0, 1)')
    clock.advance(50)
    expect(f.style['backgroundColor']).toBe('rgba(99, 99, 99, 1)')
    clock.advance(50)
    // At rest the committed declaration is written back as it was.
    expect(f.style['backgroundColor']).toBe('#ffffff')
    expect(clock.pending).toBe(0)
  })
  test('enter colours, reduced motion, and a value native cannot read', () => {
    const clock = createTestClock()
    const f = nativeHost({ color: 'rgb(255, 0, 0)' })
    const motion = attachMotion(
      f.host,
      {
        properties: ['color'],
        enter: { color: 'transparent' },
        transition: { type: 'timing', duration: 100 },
        reducedMotion: false,
      },
      { clock },
    )
    expect(f.style['color']).toBe('rgba(0, 0, 0, 0)')
    clock.advance(50)
    expect(f.style['color']).toBe('rgba(255, 0, 0, 0.5)')
    motion.finish()
    expect(f.style['color']).toBe('rgb(255, 0, 0)')
    expect(() => f.commit({ color: 'var(--ink)' })).toThrow(
      'color on native must be a colour literal',
    )
  })
})

describe('transform targets', () => {
  test('translate, rotate and scale are separate channels in the transform array', () => {
    const clock = createTestClock()
    const f = nativeHost({ transform: [{ perspective: 500 }] })
    attachMotion(
      f.host,
      {
        properties: ['translateY', 'rotate', 'scale'],
        transition: { type: 'timing', duration: 100 },
      },
      { clock },
    )
    f.commit({
      transform: [
        { perspective: 500 },
        { translateY: 100 },
        { rotate: '90deg' },
      ],
    })
    clock.advance(50)
    expect(f.style['transform']).toEqual([
      { perspective: 500 },
      { translateX: 0 },
      { translateY: 50 },
      { rotate: '45deg' },
      { scale: 1 },
    ])
    // Interrupted from where it is: only translate changes target.
    f.commit({ transform: [{ perspective: 500 }, { rotate: '90deg' }] })
    clock.advance(50)
    expect(f.style['transform']).toEqual([
      { perspective: 500 },
      { translateX: 0 },
      { translateY: 25 },
      { rotate: '67.5deg' },
      { scale: 1 },
    ])
    clock.advance(50)
    expect(f.style['transform']).toEqual([
      { perspective: 500 },
      { rotate: '90deg' },
    ])
  })
  test('exit to a transform and opacity, from a portable declaration', async () => {
    const clock = createTestClock()
    const f = nativeHost({ opacity: 1 })
    const motion = attachMotion(
      f.host,
      {
        properties: ['opacity', 'translateY'],
        exit: { opacity: 0, translateY: 20 },
        transition: { type: 'timing', duration: 100 },
      },
      { clock },
    )
    const done = motion.exit()
    clock.advance(50)
    expect(f.style['opacity']).toBe(0.5)
    expect(f.style['transform']).toEqual([
      { translateX: 0 },
      { translateY: 10 },
    ])
    clock.advance(50)
    expect(await done).toBe('finished')
    expect(f.style['transform']).toEqual([
      { translateX: 0 },
      { translateY: 20 },
    ])
  })
})

describe('transitions keyed by declared state', () => {
  const panel = defineMotion(ui, {
    properties: ['opacity'],
    transition: { type: 'timing', duration: 100 },
    states: {
      ':open': { type: 'timing', duration: 200 },
      [ui.q.all(ui.q.state('open'), ui.q.state('saving'))]: {
        type: 'timing',
        duration: 400,
      },
    },
  })
  test('the state active at the target change picks the transition', () => {
    const clock = createTestClock()
    const f = nativeHost({ opacity: 0 })
    attachMotion(f.host, panel, { clock })
    f.set('open')
    f.commit({ opacity: 1 })
    clock.advance(100)
    expect(f.style['opacity']).toBe(0.5)
    clock.advance(100)
    f.set('open', 'saving')
    f.commit({ opacity: 0 })
    clock.advance(100)
    expect(f.style['opacity']).toBe(0.75)
    clock.advance(300)
    f.set()
    f.commit({ opacity: 1 })
    clock.advance(50)
    expect(f.style['opacity']).toBe(0.5)
  })
  test('a state source (a Weft run) overrides the host reader', () => {
    const clock = createTestClock()
    const f = nativeHost({ opacity: 0 })
    let waits = ['saving', 'open']
    const listeners = new Set<() => void>()
    attachMotion(f.host, panel, {
      clock,
      states: {
        current: () => waits,
        subscribe(listener) {
          listeners.add(listener)
          return () => listeners.delete(listener)
        },
      },
    })
    f.commit({ opacity: 1 })
    clock.advance(200)
    expect(f.style['opacity']).toBe(0.5)
    waits = []
    for (const listener of listeners) listener()
    f.commit({ opacity: 0 })
    clock.advance(50)
    expect(f.style['opacity']).toBe(0.25)
  })
  test('one clock drives every controller it is given', () => {
    const clock = createTestClock()
    const a = nativeHost({ opacity: 0 })
    const b = nativeHost({ opacity: 0 })
    attachMotion(a.host, panel, { clock })
    attachMotion(b.host, panel, { clock })
    a.commit({ opacity: 1 })
    b.set('open')
    b.commit({ opacity: 1 })
    expect(clock.pending).toBe(2)
    clock.advance(50)
    expect([a.style['opacity'], b.style['opacity']]).toEqual([0.5, 0.25])
  })
  test('state-keyed motion needs the host to read its states', () => {
    const style: Record<string, unknown> = { opacity: 0 }
    const host = {
      setNativeProps(patch: Record<string, unknown>) {
        Object.assign(style, patch['style'])
      },
    }
    registerNativeHost(host, {
      id: 'toned-test/no-states',
      renderer: 'custom',
      version: '1',
      accepts: () => true,
      patch: (_h: object, props: Record<string, unknown>) =>
        Object.assign(style, props['style']),
      resetStyle: () => null,
      resetProp: () => null,
    })
    const owner = {}
    recordHostCommit(host, { style }, {}, owner)
    setStyles(host, { style }, owner)
    expect(() => attachMotion(host, panel)).toThrow(
      'pass a states source, or give the native host readState',
    )
  })
})

test('reduced motion settles colour and transform channels at once', () => {
  const clock = createTestClock()
  const f = nativeHost({ backgroundColor: '#000000' })
  let reduce: (value: boolean) => void = () => {}
  attachMotion(
    f.host,
    {
      properties: ['backgroundColor', 'translateY'],
      transition: { type: 'timing', duration: 100 },
      reducedMotion: {
        current: () => false,
        subscribe(listener) {
          reduce = listener
          return () => {}
        },
      },
    },
    { clock },
  )
  f.commit({ backgroundColor: '#ffffff', transform: [{ translateY: 40 }] })
  clock.advance(50)
  expect(f.style['transform']).toEqual([{ translateX: 0 }, { translateY: 20 }])
  reduce(true)
  expect(f.style['backgroundColor']).toBe('#ffffff')
  expect(f.style['transform']).toEqual([{ translateY: 40 }])
  expect(clock.pending).toBe(0)
  f.commit({ backgroundColor: '#000000', transform: [] })
  expect(f.style['backgroundColor']).toBe('#000000')
  expect(clock.pending).toBe(0)
})
