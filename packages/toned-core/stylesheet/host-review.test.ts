// @vitest-environment happy-dom
import { expect, test } from 'vitest'
import { recordHostCommit, releaseHost, setStyles } from './applyStyles.ts'

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
  recordHostCommit(host, { style: { opacity: 0 }, placeholderTextColor: 'red' })
  setStyles(host, { style: { opacity: 1 }, placeholderTextColor: 'blue' })
  live['opacity'] = null
  live['placeholderTextColor'] = 'green'
  recordHostCommit(host, { style: {}, placeholderTextColor: 'green' })
  setStyles(host, { style: { opacity: 1 }, placeholderTextColor: 'blue' })
  expect(live).toEqual({ opacity: 1, placeholderTextColor: 'blue' })
})
