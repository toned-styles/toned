// @vitest-environment happy-dom
import { expect, test } from 'vitest'
import { registerFixtureHost } from '../testing/native-host.test.fixture.ts'
import {
  prepareHostRelease,
  recordHostCommit,
  releaseHost,
  setStyles,
} from './applyStyles.ts'

test('one controller cannot remove a class still requested by another controller', () => {
  const host = document.createElement('div')
  const outer = {}
  const inner = {}
  setStyles(host, { className: 'opacity_50' }, outer)
  setStyles(host, { className: 'opacity_50' }, inner)
  setStyles(host, {}, outer)
  expect(host.classList.contains('opacity_50')).toBe(true)
})

test('one controller cannot clear a field still requested by another controller', () => {
  const host = document.createElement('div')
  const outer = {}
  const inner = {}
  setStyles(host, { style: { opacity: 0.5 } }, outer)
  setStyles(host, { style: { opacity: 0.5 } }, inner)
  setStyles(host, {}, outer)
  expect(host.style.opacity).toBe('0.5')
})

test('native commit restores unchanged interaction output after a changed resting prop', () => {
  const live: Record<string, unknown> = { opacity: 0 }
  const host = {
    setNativeProps: (patch: { style?: Record<string, unknown> }) =>
      Object.assign(live, patch.style),
  }
  registerFixtureHost(host)
  recordHostCommit(host, { style: { opacity: 0 } })
  setStyles(host, { style: { opacity: 1 } })
  // React commits a new resting prop while this host remains hovered.
  live['opacity'] = 0.5
  recordHostCommit(host, { style: { opacity: 0.5 } })
  setStyles(host, { style: { opacity: 1 } })
  expect(live['opacity']).toBe(1)
})

test('attachment order and surviving-owner restoration do not depend on event order', () => {
  const host = document.createElement('div')
  const outer = {}
  const inner = {}
  setStyles(host, { style: { opacity: 0.2 }, className: 'outer' }, outer)
  setStyles(host, { style: { opacity: 0.8 }, className: 'inner' }, inner)
  setStyles(host, { style: { opacity: 0.4 }, className: 'outer-active' }, outer)
  expect(host.style.opacity).toBe('0.8')
  releaseHost(host, inner)
  expect(host.style.opacity).toBe('0.4')
  expect(host.className).toBe('outer-active')
})

test('caller fields survive other controllers changing and detaching', () => {
  const host = document.createElement('div')
  const outer = {}
  const inner = {}
  setStyles(host, { style: { opacity: 0.2 } }, outer)
  recordHostCommit(
    host,
    { style: { width: 10 } },
    { style: { opacity: 0.8 }, className: 'caller' },
    inner,
  )
  setStyles(host, { style: { width: 10 } }, inner)
  releaseHost(host, outer)
  expect(host.style.opacity).toBe('0.8')
  expect(host.classList.contains('caller')).toBe(true)
})

test('native commit invalidates removed resting fields and changed bridge props', () => {
  const live: Record<string, unknown> = {
    opacity: 0,
    placeholderTextColor: 'red',
  }
  const host = {
    setNativeProps: ({ style, ...props }: Record<string, unknown>) =>
      Object.assign(live, style, props),
  }
  registerFixtureHost(host)
  recordHostCommit(host, { style: { opacity: 0 }, placeholderTextColor: 'red' })
  setStyles(host, { style: { opacity: 1 }, placeholderTextColor: 'blue' })
  live['opacity'] = null
  live['placeholderTextColor'] = 'green'
  recordHostCommit(host, { style: {}, placeholderTextColor: 'green' })
  setStyles(host, { style: { opacity: 1 }, placeholderTextColor: 'blue' })
  expect(live).toEqual({ opacity: 1, placeholderTextColor: 'blue' })
})

test('final release never removes a new caller declaration on a connected host', () => {
  const host = document.createElement('div')
  document.body.append(host)
  const owner = {}
  const resting = { className: 'toned', style: { color: 'red', opacity: 0.5 } }
  const caller = { className: 'caller', style: { color: 'purple' } }
  recordHostCommit(host, resting, caller, owner)
  setStyles(host, resting, owner)
  // A new React declaration takes over, retaining identical caller values.
  host.className = 'caller'
  host.style.color = 'purple'
  host.style.opacity = '0.5'
  releaseHost(host, owner)
  expect(host.isConnected).toBe(true)
  expect(host.className).toBe('caller')
  expect(host.style.color).toBe('purple')
  expect(host.style.opacity).toBe('0.5')
  host.remove()
})

test('ref cleanup restores the declaration before an identical-valued caller takeover', () => {
  const host = document.createElement('div')
  const owner = {}
  const resting = { className: 'toned-base', style: { opacity: 0.5 } }
  const caller = { className: 'caller', style: { color: 'purple' } }
  recordHostCommit(host, resting, caller, owner)
  setStyles(
    host,
    { className: 'toned-hover', style: { opacity: 1, width: 24 } },
    owner,
  )
  prepareHostRelease(host, owner)
  expect(host.style.opacity).toBe('0.5')
  expect(host.style.width).toBe('')
  expect(host.style.color).toBe('purple')
  expect(host.className).toBe('caller toned-base')

  // New React props deliberately equal the old imperative output. A delayed
  // cleanup cannot use value equality to infer that Toned still owns them.
  host.style.width = '24px'
  host.style.opacity = '1'
  host.className = 'caller toned-hover'
  releaseHost(host, owner)
  expect(host.style.width).toBe('24px')
  expect(host.style.opacity).toBe('1')
  expect(host.className).toBe('caller toned-hover')
})

test('preparing one ref release retains the surviving controller interaction', () => {
  const host = document.createElement('div')
  const first = {}
  const second = {}
  recordHostCommit(host, { style: { opacity: 0.2 } }, {}, first)
  setStyles(host, { style: { opacity: 0.4 }, className: 'first-active' }, first)
  recordHostCommit(host, { style: { width: 10 } }, {}, second)
  setStyles(host, { style: { width: 20 }, className: 'second-active' }, second)
  prepareHostRelease(host, second)
  expect(host.style.opacity).toBe('0.4')
  expect(host.style.width).toBe('10px')
  expect(host.classList.contains('first-active')).toBe(true)
  expect(host.classList.contains('second-active')).toBe(false)
  releaseHost(host, second)
  expect(host.style.opacity).toBe('0.4')
  expect(host.style.width).toBe('')
  expect(host.className).toBe('first-active')
})
