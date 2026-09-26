import { describe, expect, test } from 'vitest'
import {
  prepareHostRelease,
  recordHostCommit,
  releaseHost,
  setStyles,
} from '../stylesheet/applyStyles.ts'
import { registerFixtureHost } from '../testing/native-host.test.fixture.ts'
import { attachMotion, type MotionFrameDriver } from './index.ts'

function setup(initial = 0) {
  let now = 0
  let sequence = 0
  const pending = new Map<number, (time: number) => void>()
  const frames: MotionFrameDriver = {
    now: () => now,
    request(callback) {
      pending.set(++sequence, callback)
      return sequence
    },
    cancel(handle) {
      pending.delete(handle as number)
    },
  }
  const style: Record<string, unknown> = { opacity: initial }
  const patches: Record<string, unknown>[] = []
  const host = {
    setNativeProps(patch: Record<string, unknown>) {
      patches.push(patch)
      Object.assign(style, patch['style'])
    },
  }
  registerFixtureHost(host)
  const owner = {}
  recordHostCommit(host, { style: { opacity: initial } }, {}, owner)
  setStyles(host, { style: { opacity: initial } }, owner)
  return {
    host,
    style,
    patches,
    owner,
    frames,
    pending,
    step(time: number) {
      now = time
      const callbacks = [...pending.values()]
      pending.clear()
      for (const callback of callbacks) callback(time)
    },
    update(opacity: number) {
      setStyles(host, { style: { opacity } }, owner)
    },
  }
}

describe('portable motion coordinated host output', () => {
  test('timing interrupts from the actual current value without React renders', () => {
    const f = setup()
    const motion = attachMotion(f.host, {
      properties: ['opacity'],
      frames: f.frames,
      transition: { type: 'timing', duration: 100 },
    })
    f.update(1)
    expect(f.pending.size).toBe(1)
    f.step(50)
    expect(f.style['opacity']).toBe(0.5)
    f.update(0)
    f.step(100)
    expect(f.style['opacity']).toBe(0.25)
    f.step(150)
    expect(f.style['opacity']).toBe(0)
    expect(motion.running).toBe(false)
    expect(f.pending.size).toBe(0)
    motion.dispose()
  })
  test('unrelated repeated targets do not restart progress', () => {
    const f = setup()
    attachMotion(f.host, {
      properties: ['opacity'],
      frames: f.frames,
      transition: { type: 'timing', duration: 100 },
    })
    f.update(1)
    f.step(50)
    f.update(1)
    f.step(100)
    expect(f.style['opacity']).toBe(1)
    expect(f.pending.size).toBe(0)
  })
  test('spring settles, keeps interruption velocity and bounds suspended-frame work', () => {
    const f = setup()
    attachMotion(f.host, {
      properties: ['opacity'],
      frames: f.frames,
      transition: { type: 'spring', maxDuration: 2000 },
    })
    f.update(1)
    f.step(16)
    const first = f.style['opacity'] as number
    expect(first).toBeGreaterThan(0)
    f.update(0)
    f.step(32)
    expect(f.style['opacity']).toBeGreaterThan(first)
    f.step(3000)
    expect(f.style['opacity']).toBe(0)
    expect(f.pending.size).toBe(0)
  })
  test('reduced motion settles active motion and unsubscribes once', () => {
    const f = setup()
    let listener: (value: boolean) => void = () => {}
    let detached = 0
    const motion = attachMotion(f.host, {
      properties: ['opacity'],
      frames: f.frames,
      reducedMotion: {
        current: () => false,
        subscribe(callback) {
          listener = callback
          return () => {
            detached++
          }
        },
      },
    })
    f.update(1)
    f.step(50)
    listener(true)
    expect(f.style['opacity']).toBe(1)
    expect(f.pending.size).toBe(0)
    f.update(0)
    expect(f.style['opacity']).toBe(0)
    motion.dispose()
    motion.dispose()
    expect(detached).toBe(1)
  })
  test('enter and retained-host exit complete; detached exit cancels', async () => {
    const f = setup(1)
    const motion = attachMotion(f.host, {
      properties: ['opacity'],
      frames: f.frames,
      enter: { opacity: 0 },
      exit: { opacity: 0 },
      transition: { type: 'timing', duration: 100 },
    })
    expect(f.style['opacity']).toBe(0)
    f.step(100)
    expect(f.style['opacity']).toBe(1)
    const exiting = motion.exit()
    f.step(150)
    expect(f.style['opacity']).toBe(0.5)
    f.step(200)
    expect(await exiting).toBe('finished')
    expect(f.style['opacity']).toBe(0)
    const cancelled = motion.exit()
    prepareHostRelease(f.host, f.owner)
    releaseHost(f.host, f.owner)
    expect(await cancelled).toBe('finished') // already at exit target
    expect(f.pending.size).toBe(0)
  })
  test('final ref release cancels pending exit after restoring caller declaration', async () => {
    const f = setup(1)
    const motion = attachMotion(f.host, {
      properties: ['opacity'],
      frames: f.frames,
      exit: { opacity: 0 },
    })
    const promise = motion.exit()
    f.step(20)
    prepareHostRelease(f.host, f.owner)
    expect(f.style['opacity']).toBe(1)
    expect(motion.running).toBe(true)
    releaseHost(f.host, f.owner)
    expect(await promise).toBe('cancelled')
    const count = f.patches.length
    f.step(500)
    expect(f.patches.length).toBe(count)
  })
  test('caller precedence, removed fields and unsupported values stay explicit', () => {
    const f = setup()
    f.style['opacity'] = 0.8 // React's declarative write precedes its ref commit.
    recordHostCommit(
      f.host,
      { style: { opacity: 0 } },
      { style: { opacity: 0.8 } },
      f.owner,
    )
    setStyles(f.host, { style: { opacity: 0 } }, f.owner)
    attachMotion(f.host, { properties: ['opacity'], frames: f.frames })
    f.update(1)
    expect(f.style['opacity']).toBe(0.8)
    expect(f.pending.size).toBe(0)
    const other = setup()
    attachMotion(other.host, { properties: ['opacity'], frames: other.frames })
    other.update(1)
    other.step(50)
    setStyles(other.host, {}, other.owner)
    expect(other.style['opacity']).toBe(null)
    expect(other.pending.size).toBe(0)
    expect(() =>
      setStyles(other.host, { style: { opacity: 'var(--x)' } }, other.owner),
    ).toThrow('must be finite')
    expect(() =>
      attachMotion(other.host, { properties: ['color' as never] }),
    ).toThrow('Unsupported motion property')
  })
})

test('spring interruption at the current position retains nonzero momentum', () => {
  const f = setup()
  const motion = attachMotion(f.host, {
    properties: ['opacity'],
    frames: f.frames,
    transition: { type: 'spring' },
  })
  f.update(1)
  f.step(16)
  const position = f.style['opacity'] as number
  f.update(position)
  expect(motion.running).toBe(true)
  f.step(32)
  expect(f.style['opacity']).toBeGreaterThan(position)
  motion.dispose()
  expect(f.pending.size).toBe(0)
})

test('invalid frame/easing inputs cancel exits and do not leave scheduled work', async () => {
  const f = setup(1)
  const motion = attachMotion(f.host, {
    properties: ['opacity'],
    frames: f.frames,
    exit: { opacity: 0 },
  })
  const exit = motion.exit()
  expect(() => f.step(Number.NaN)).toThrow('frame timestamp must be finite')
  expect(await exit).toBe('cancelled')
  expect(f.pending.size).toBe(0)
  expect(motion.running).toBe(false)
  motion.dispose()
  const g = setup(1)
  const other = attachMotion(g.host, {
    properties: ['opacity'],
    frames: g.frames,
    exit: { opacity: 0 },
    transition: { type: 'timing', easing: () => Number.NaN },
  })
  const otherExit = other.exit()
  expect(() => g.step(16)).toThrow('easing result must be finite')
  expect(await otherExit).toBe('cancelled')
  expect(g.pending.size).toBe(0)
  other.dispose()
})

test('a synchronous frame driver is diagnosed instead of recursively scheduling', () => {
  const f = setup(1)
  expect(() =>
    attachMotion(f.host, {
      properties: ['opacity'],
      enter: { opacity: 0 },
      frames: {
        now: () => 0,
        request(callback) {
          callback(0)
          return 1
        },
        cancel() {},
      },
    }),
  ).toThrow('callbacks asynchronously')
  expect(f.style['opacity']).toBe(1) // Failed install rolls back its entry write.
})

test('unrepresentable spring arithmetic cancels without another frame', async () => {
  const f = setup(1)
  const motion = attachMotion(f.host, {
    properties: ['opacity'],
    frames: f.frames,
    exit: { opacity: 0 },
    transition: {
      type: 'spring',
      stiffness: Number.MAX_VALUE,
      mass: Number.MIN_VALUE,
    },
  })
  const exit = motion.exit()
  expect(() => f.step(16)).toThrow('supported numeric range')
  expect(await exit).toBe('cancelled')
  expect(f.pending.size).toBe(0)
  expect(motion.running).toBe(false)
  motion.dispose()
})

test('native ref handoff preserves an in-flight exit and its completion', async () => {
  const f = setup(1)
  const motion = attachMotion(f.host, {
    properties: ['opacity'],
    frames: f.frames,
    exit: { opacity: 0 },
    transition: { type: 'timing', duration: 100 },
  })
  const result = motion.exit()
  f.step(50)
  expect(f.style['opacity']).toBe(0.5)
  prepareHostRelease(f.host, f.owner)
  recordHostCommit(f.host, { style: { opacity: 1 } }, {}, f.owner)
  setStyles(f.host, { style: { opacity: 1 } }, f.owner)
  expect(f.style['opacity']).toBe(0.5)
  f.step(75)
  expect(f.style['opacity']).toBe(0.25)
  f.step(100)
  expect(await result).toBe('finished')
  expect(f.style['opacity']).toBe(0)
  motion.dispose()
})
