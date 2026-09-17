// @vitest-environment happy-dom
import { afterEach, expect, test, vi } from 'vitest'
import { defineGrid, fr } from '../grid/index.ts'
import { createHostIntegration } from '../hosts/index.ts'
import { getConfig } from '../system/config.ts'
import { defineSystem } from '../system/definers.ts'
import { Base } from './StyleSheet.ts'

afterEach(() => {
  document.body.replaceChildren()
  vi.restoreAllMocks()
})

function controller(
  rules: Base['rules'] = { Label: { style: { opacity: 1 } } },
) {
  return new Base({
    ref: defineSystem({}),
    rules,
    config: {
      ...getConfig(),
      platform: 'web',
      getTokens: () => ({}),
      useClassName: false,
      mediaMode: 'css',
      pseudoMode: 'css',
    },
  })
}

test('unchanged styles do not walk mounted hosts when no host conditions are registered', () => {
  const instance = controller()
  const node = document.createElement('div')
  document.body.append(node)
  const detach = instance.attach(
    'Label',
    node,
    instance.getCurrentStyle('Label'),
  )
  const targets = instance.refs['Label'] as Set<object>
  const iterate = vi.spyOn(targets, Symbol.iterator)
  instance.applyState({})
  expect(iterate).not.toHaveBeenCalled()
  detach()
})

test('many post-commit requests validate each changed host only once', () => {
  const instance = controller()
  const validate = vi.spyOn(
    createHostIntegration(instance.config, instance.ref),
    'validate',
  )
  const cleanups: Array<() => void> = []
  for (let index = 0; index < 24; index++) {
    const node = document.createElement('div')
    document.body.append(node)
    cleanups.push(
      instance.attach('Label', node, instance.getCurrentStyle('Label')),
    )
  }
  for (let index = 0; index < 24; index++) instance.validatePendingHosts()
  expect(validate).toHaveBeenCalledTimes(24)
  const removed = document.createElement('div')
  document.body.append(removed)
  const detachRemoved = instance.attach(
    'Label',
    removed,
    instance.getCurrentStyle('Label'),
  )
  detachRemoved()
  instance.validatePendingHosts()
  expect(validate).toHaveBeenCalledTimes(24)
  for (const cleanup of cleanups) cleanup()
})

test('initial provider validation drains the subsequent per-part requests', () => {
  const instance = controller()
  const validate = vi.spyOn(
    createHostIntegration(instance.config, instance.ref),
    'validate',
  )
  const node = document.createElement('div')
  document.body.append(node)
  const detach = instance.attach(
    'Label',
    node,
    instance.getCurrentStyle('Label'),
  )
  instance.validateHosts()
  instance.validatePendingHosts()
  expect(validate).toHaveBeenCalledTimes(1)
  detach()
})

test('stale ref cleanup cannot erase the current generation from pending validation', () => {
  const instance = controller()
  const validate = vi.spyOn(
    createHostIntegration(instance.config, instance.ref),
    'validate',
  )
  const node = document.createElement('div')
  document.body.append(node)
  const old = instance.attach('Label', node, instance.getCurrentStyle('Label'))
  const current = instance.attach(
    'Label',
    node,
    instance.getCurrentStyle('Label'),
  )
  old()
  instance.validatePendingHosts()
  expect(validate).toHaveBeenCalledTimes(1)
  current()
})

test('detaching a grid owner queues retained child ownership edges for validation', () => {
  const grid = defineGrid('retained-grid-child', {
    columns: [fr(1)],
    areas: [['body']],
  })
  const instance = controller({
    Root: { $grid: grid },
    Body: { $area: grid.area('body') },
  })
  const outer = document.createElement('div')
  const inner = document.createElement('div')
  const body = document.createElement('div')
  outer.append(inner)
  inner.append(body)
  document.body.append(outer)
  const detachRoot = instance.attach(
    'Root',
    inner,
    instance.getCurrentStyle('Root'),
  )
  const detachBody = instance.attach(
    'Body',
    body,
    instance.getCurrentStyle('Body'),
  )
  instance.validateHosts()
  detachRoot()
  const detachReplacement = instance.attach(
    'Root',
    outer,
    instance.getCurrentStyle('Root'),
  )
  expect(() => instance.validatePendingHosts()).toThrow(/direct parent/)
  detachBody()
  expect(() => instance.validatePendingHosts()).not.toThrow()
  detachReplacement()
})
