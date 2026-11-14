// @vitest-environment happy-dom
import { afterEach, expect, test } from 'vitest'

import { recordHostCommit, setStyles } from '../stylesheet/applyStyles.ts'
import { defineSystem, defineToken } from '../system/index.ts'
import { attachMotion, createTestClock, defineMotion } from './index.ts'

// Browsers expose `translate`, `rotate` and `scale` as CSSOM accessors over
// the declaration; happy-dom stores them as plain fields. Install the
// browser behaviour so the writer's read-back sees what it wrote.
for (const name of ['translate', 'rotate', 'scale'])
  Object.defineProperty(CSSStyleDeclaration.prototype, name, {
    configurable: true,
    get(this: CSSStyleDeclaration) {
      return this.getPropertyValue(name)
    },
    set(this: CSSStyleDeclaration, value: string) {
      if (value === '') this.removeProperty(name)
      else this.setProperty(name, value)
    },
  })
afterEach(() => {
  document.body.innerHTML = ''
  document.head.innerHTML = ''
})
function setup(css: string, className: string) {
  const sheet = document.createElement('style')
  sheet.textContent = css
  document.head.append(sheet)
  const host = document.createElement('div')
  document.body.append(host)
  host.className = className
  const owner = {}
  recordHostCommit(host, { className }, {}, owner)
  setStyles(host, { className }, owner)
  return {
    host,
    commit: (next: string) => setStyles(host, { className: next }, owner),
  }
}
const channel = (text: string) => text.replace(/\s+/g, '')

test('class colours are sampled, interpolated in oklab and released to CSS', () => {
  const clock = createTestClock()
  const f = setup(
    '.rest { background-color: #000000 } .on { background-color: #ffffff }',
    'rest',
  )
  attachMotion(
    f.host,
    {
      properties: ['backgroundColor'],
      transition: { type: 'timing', duration: 100 },
    },
    { clock },
  )
  f.commit('on')
  clock.advance(50)
  expect(channel(f.host.style.backgroundColor)).toMatch(
    /^rgba?\(99,99,99(,1)?\)$/,
  )
  clock.advance(50)
  expect(f.host.style.backgroundColor).toBe('')
  expect(f.host.className).toBe('on')
})

test('a token colour resolves through the active theme', () => {
  const clock = createTestClock()
  const f = setup(
    ':root { --ink: #000000 } [data-theme=dark] { --ink: #ffffff } .card { color: #ffffff }',
    'card',
  )
  document.body.dataset['theme'] = 'dark'
  attachMotion(
    f.host,
    {
      properties: ['color'],
      enter: { color: 'var(--ink)' },
      transition: { type: 'timing', duration: 100 },
    },
    { clock },
  )
  // Dark theme: the token is white, so entering from it to white is no motion.
  expect(clock.pending).toBe(0)
  document.body.dataset['theme'] = 'light'
  const g = setup('.card { color: #ffffff }', 'card')
  attachMotion(
    g.host,
    {
      properties: ['color'],
      enter: { color: 'var(--ink)' },
      transition: { type: 'timing', duration: 100 },
    },
    { clock },
  )
  clock.advance(50)
  expect(channel(g.host.style.color)).toMatch(/^rgba?\(99,99,99(,1)?\)$/)
})

test('transforms animate as individual web transform properties', () => {
  const clock = createTestClock()
  const f = setup(
    '.rest { opacity: 1 } .on { translate: 0px 100px; rotate: 90deg; scale: 2 }',
    'rest',
  )
  attachMotion(
    f.host,
    {
      properties: ['translateY', 'rotate', 'scale'],
      transition: { type: 'timing', duration: 100 },
    },
    { clock },
  )
  f.commit('on')
  clock.advance(50)
  expect(f.host.style.translate).toBe('0px 50px')
  expect(f.host.style.rotate).toBe('45deg')
  expect(f.host.style.scale).toBe('1.5')
  clock.advance(50)
  expect(f.host.style.translate).toBe('')
  expect(f.host.style.rotate).toBe('')
})

test('a declared state on the host picks the transition, with no Toned write', async () => {
  const opacity = defineToken({
    values: [0, 1] as const,
    resolve: (value) => ({ opacity: value }),
  })
  const ui = defineSystem({
    id: 'motion-web',
    tokens: { opacity },
    conditions: { states: { open: "[data-state='open']" } },
  })
  const panel = defineMotion(ui, {
    properties: ['opacity'],
    transition: { type: 'timing', duration: 100 },
    states: { ':open': { type: 'timing', duration: 400 } },
  })
  const clock = createTestClock()
  const f = setup(
    ".panel { opacity: 0 } .panel[data-state='open'] { opacity: 1 }",
    'panel',
  )
  attachMotion(f.host, panel, { clock })
  // What a Weft binding does: one attribute toggle, no stylesheet write.
  f.host.dataset['state'] = 'open'
  await Promise.resolve()
  clock.advance(100)
  expect(Number(f.host.style.opacity)).toBeCloseTo(0.25)
  clock.advance(300)
  delete f.host.dataset['state']
  await Promise.resolve()
  clock.advance(50)
  expect(Number(f.host.style.opacity)).toBeCloseTo(0.5)
})
