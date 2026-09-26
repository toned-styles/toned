// @vitest-environment happy-dom
import { afterEach, expect, test, vi } from 'vitest'
import {
  prepareHostRelease,
  recordHostCommit,
  releaseHost,
  setStyles,
} from '../stylesheet/applyStyles.ts'
import { attachMotion, type MotionFrameDriver } from './index.ts'

afterEach(() => {
  vi.restoreAllMocks()
  document.body.innerHTML = ''
  document.head.innerHTML = ''
})
function setup() {
  let now = 0
  let run: ((time: number) => void) | undefined
  const frames: MotionFrameDriver = {
    now: () => now,
    request(callback) {
      run = callback
      return 1
    },
    cancel() {
      run = undefined
    },
  }
  const host = document.createElement('div')
  document.body.append(host)
  const owner = {}
  return {
    host,
    owner,
    frames,
    step(next: number) {
      now = next
      const callback = run
      run = undefined
      callback?.(next)
    },
  }
}

test('generated CSS class targets are sampled, animated, and released back to CSS', () => {
  const css = document.createElement('style')
  css.textContent =
    '.rest { opacity: 0.2; width: 20px } .open { opacity: 1; width: 100px }'
  document.head.append(css)
  const f = setup()
  f.host.className = 'rest'
  recordHostCommit(f.host, { className: 'rest' }, {}, f.owner)
  setStyles(f.host, { className: 'rest' }, f.owner)
  attachMotion(f.host, {
    properties: ['opacity', 'width'],
    frames: f.frames,
    transition: { type: 'timing', duration: 100 },
  })
  setStyles(f.host, { className: 'open' }, f.owner)
  expect(f.host.style.opacity).toBe('0.2')
  f.step(50)
  expect(Number(f.host.style.opacity)).toBeCloseTo(0.6)
  expect(f.host.style.width).toBe('60px')
  f.step(100)
  expect(f.host.style.opacity).toBe('')
  expect(f.host.style.width).toBe('')
  expect(getComputedStyle(f.host).width).toBe('100px')
  expect(f.host.className).toBe('open')
})

test('release restores declaration and stale frame callback cannot mutate a reused host', () => {
  const f = setup()
  f.host.style.opacity = '0.4'
  recordHostCommit(f.host, { style: { opacity: 0.4 } }, {}, f.owner)
  setStyles(f.host, { style: { opacity: 0.4 } }, f.owner)
  let stale: ((time: number) => void) | undefined
  const motion = attachMotion(f.host, {
    properties: ['opacity'],
    frames: {
      now: () => 0,
      request(callback) {
        stale = callback
        return 1
      },
      cancel() {},
    },
  })
  setStyles(f.host, { style: { opacity: 1 } }, f.owner)
  stale?.(50)
  prepareHostRelease(f.host, f.owner)
  expect(f.host.style.opacity).toBe('0.4')
  f.host.style.opacity = '0.9' // React hands this host to a different declaration.
  releaseHost(f.host, f.owner)
  stale?.(100)
  expect(f.host.style.opacity).toBe('0.9')
  motion.dispose()
})

test('external baseline survives animated property removal', () => {
  const f = setup()
  f.host.style.opacity = '0.3'
  setStyles(f.host, { style: { opacity: 0.5 } }, f.owner)
  const motion = attachMotion(f.host, {
    properties: ['opacity'],
    frames: f.frames,
    transition: { type: 'timing', duration: 100 },
  })
  setStyles(f.host, { style: { opacity: 1 } }, f.owner)
  f.step(100)
  setStyles(f.host, {}, f.owner)
  f.step(200)
  expect(f.host.style.opacity).toBe('0.3')
  motion.dispose()
})

test.each([
  ['top', 'auto'],
  ['gap', 'normal'],
  ['width', 'auto'],
  ['height', 'auto'],
  ['margin', '0px 8px'],
  ['padding', '0px 8px'],
  ['borderRadius', '50%'],
] as const)(
  'computed %s=%s jumps while other properties keep animating',
  (property, value) => {
    const f = setup()
    let computedValue = value as string
    const realComputedStyle = window.getComputedStyle.bind(window)
    vi.spyOn(window, 'getComputedStyle').mockImplementation((element) => {
      const computed = realComputedStyle(element)
      const read = computed.getPropertyValue.bind(computed)
      computed.getPropertyValue = (name) =>
        name ===
        property.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`)
          ? computedValue
          : read(name)
      return computed
    })
    const update = (opacity: number, target: string | number) =>
      setStyles(f.host, { style: { opacity, [property]: target } }, f.owner)
    update(0, value)
    const motion = attachMotion(f.host, {
      properties: ['opacity', property],
      frames: f.frames,
      transition: { type: 'timing', duration: 100 },
    })
    computedValue = '20px'
    update(1, 20)
    expect(f.host.style[property]).toBe('20px')
    f.step(50)
    expect(Number(f.host.style.opacity)).toBe(0.5)
    computedValue = value
    update(1, value)
    expect(f.host.style[property]).toBe(value)
    f.step(100)
    expect(f.host.style.opacity).toBe('0.75')
    f.step(150)
    expect(f.host.style.opacity).toBe('1')
    expect(f.host.style[property]).toBe(value)
    motion.dispose()
  },
)
