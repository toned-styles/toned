// @vitest-environment happy-dom
import { expect, test } from 'vitest'
import { getConfig } from '../system/config.ts'
import { defineSystem } from '../system/definers.ts'
import { Base } from './StyleSheet.ts'

const system = defineSystem({})
function setup(platform: 'web' | 'native' = 'web') {
  const predicate = system.q.part('Root').has('Item', 'hover')
  return new Base({
    ref: system,
    config: {
      ...getConfig(),
      platform,
      useClassName: false,
      mediaMode: false,
      pseudoMode: 'runtime',
    },
    rules: {
      Root: { style: { opacity: 1 } },
      Item: {},
      Middle: {},
      [predicate]: { Root: { style: { opacity: 0.5 } } },
    },
  })
}
test('committed native relations require explicit topology support', () => {
  const base = setup('native')
  expect(() => base.mount()).toThrow(
    /nativeHost.parentOf and subscribeTopology/,
  )
})
test('mounted relation state updates and DOM moves are isolated and cleaned up', async () => {
  const base = setup()
  const root = document.createElement('div'),
    item = document.createElement('div')
  root.append(item)
  document.body.append(root)
  const detachItem = base.attach('Item', item, {})
  const detachRoot = base.attach('Root', root, { style: { opacity: 1 } })
  const unmount = base.mount()
  base.setElementActive('Item', ':hover', item, true)
  expect(root.style.opacity).toBe('0.5')
  document.body.append(item)
  await new Promise((resolve) => setTimeout(resolve, 0))
  expect(root.style.opacity).toBe('1')
  root.append(item)
  await new Promise((resolve) => setTimeout(resolve, 0))
  expect(root.style.opacity).toBe('0.5')
  detachItem()
  await Promise.resolve()
  expect(root.style.opacity).toBe('1')
  detachRoot()
  unmount()
  root.remove()
  item.remove()
})
test('candidate construction does not publish relation subscriptions or state', () => {
  const base = setup()
  const root = document.createElement('div'),
    item = document.createElement('div')
  root.append(item)
  document.body.append(root)
  const a = base.attach('Root', root, { style: { opacity: 1 } })
  const b = base.attach('Item', item, {})
  const unmount = base.mount()
  const candidate = setup()
  candidate.prepare(base)
  base.setElementActive('Item', ':hover', item, true)
  expect(root.style.opacity).toBe('0.5')
  a()
  b()
  unmount()
  root.remove()
})

test('declared checked state responds to real input events without a styling render', () => {
  const system = defineSystem({
    id: 'checked-relations',
    tokens: {},
    conditions: { states: { checked: ':checked' } },
  })
  const base = new Base({
    ref: system,
    config: {
      ...getConfig(),
      platform: 'web',
      useClassName: false,
      mediaMode: false,
      pseudoMode: 'runtime',
    },
    rules: {
      Root: { style: { opacity: 1 } },
      Item: {},
      [system.q.part('Root').has('Item', 'checked')]: {
        Root: { style: { opacity: 0.5 } },
      },
    },
  })
  const root = document.createElement('div'),
    item = document.createElement('input')
  item.type = 'checkbox'
  root.append(item)
  document.body.append(root)
  const a = base.attach('Root', root, { style: { opacity: 1 } })
  const b = base.attach('Item', item, {})
  const unmount = base.mount()
  item.checked = true
  item.dispatchEvent(new Event('change', { bubbles: true }))
  expect(root.style.opacity).toBe('0.5')
  item.checked = false
  item.dispatchEvent(new Event('change', { bubbles: true }))
  expect(root.style.opacity).toBe('1')
  a()
  b()
  unmount()
  root.remove()
})

test('native host topology and semantic state callbacks drive the same relation facts', async () => {
  const { registerNativeHost } = await import('./native-host.ts')
  const system = defineSystem({
    id: 'native-relations',
    tokens: {},
    conditions: { states: { checked: ':checked' } },
  })
  const root = { style: {} as Record<string, unknown> },
    item = {}
  let parent: object | undefined = root
  let checked = false
  let update = () => {}
  let unsubscribed = false
  let subscriptions = 0
  const adapter = {
    id: 'fixture/relations',
    renderer: 'custom' as const,
    version: '1',
    accepts: () => true,
    patch: (host: object, props: Record<string, unknown>) => {
      if (host === root) Object.assign(root.style, props['style'])
    },
    resetStyle: () => null,
    resetProp: () => null,
    parentOf: (host: object) => (host === item ? parent : undefined),
    readState: () => checked,
    subscribeTopology: (callback: () => void) => {
      subscriptions++
      update = callback
      return () => {
        unsubscribed = true
      }
    },
  }
  const aHost = registerNativeHost(root, adapter),
    bHost = registerNativeHost(item, adapter)
  const base = new Base({
    ref: system,
    config: {
      ...getConfig(),
      platform: 'native',
      nativeHost: adapter,
      useClassName: false,
      mediaMode: false,
      pseudoMode: 'runtime',
    },
    rules: {
      Root: { style: { opacity: 1 } },
      Item: {},
      [system.q.part('Root').has('Item', 'checked')]: {
        Root: { style: { opacity: 0.5 } },
      },
    },
  })
  const a = base.attach('Root', root, { style: { opacity: 1 } }),
    b = base.attach('Item', item, {})
  const unmount = base.mount()
  expect(subscriptions).toBe(1)
  checked = true
  update()
  expect(root.style['opacity']).toBe(0.5)
  parent = undefined
  update()
  expect(root.style['opacity']).toBe(1)
  a()
  b()
  unmount()
  await Promise.resolve()
  aHost()
  bHost()
  expect(unsubscribed).toBe(true)
})

test('programmatic focus drives relational focus-visible without synthetic change events', () => {
  const local = defineSystem({ id: 'focus-relations', tokens: {} })
  const base = new Base({
    ref: local,
    config: {
      ...getConfig(),
      platform: 'web',
      useClassName: false,
      mediaMode: false,
      pseudoMode: 'runtime',
    },
    rules: {
      Root: { style: { opacity: 1 } },
      Item: {},
      [local.q.part('Root').has('Item', 'focus-visible')]: {
        Root: { style: { opacity: 0.5 } },
      },
    },
  })
  const root = document.createElement('div'),
    item = document.createElement('input'),
    input = item
  root.append(item)
  document.body.append(root)
  const detachRoot = base.attach('Root', root, { style: { opacity: 1 } })
  const detachItem = base.attach('Item', item, {})
  const stop = base.mount()
  input.focus()
  expect(root.style.opacity).toBe('0.5')
  input.blur()
  expect(root.style.opacity).toBe('1')
  detachItem()
  detachRoot()
  stop()
  root.remove()
})

test('foreign platform query relations impose no native host capability requirements', () => {
  const q = system.q
  const relation = q.part('Root').has('Item', 'hover')
  for (const predicate of [
    q.all(q.platform('web'), relation),
    q.not(q.any(q.platform('native'), relation)),
    q.any(q.platform('native'), relation),
  ]) {
    const rules = {
      Root: {},
      Item: {},
      [predicate]: { Root: { style: { opacity: 0.5 } } },
    }
    const base = new Base({
      ref: system,
      rules,
      config: { ...getConfig(), platform: 'native' },
    })
    expect(
      Object.keys(base.matcher.scheme).some((key) =>
        key.startsWith('relation:'),
      ),
    ).toBe(false)
    expect(base.matcher.interactions).toEqual({})
    expect(() => {
      const dispose = base.mount()
      dispose()
    }).not.toThrow()
  }
  const nested = new Base({
    ref: system,
    config: { ...getConfig(), platform: 'native' },
    rules: {
      Root: {},
      [q.all(q.platform('web'))]: {
        [relation]: { Root: { style: { opacity: 0.5 } } },
      },
    },
  })
  expect(Object.keys(nested.matcher.scheme)).toEqual([])
  expect(() => {
    const dispose = nested.mount()
    dispose()
  }).not.toThrow()
})

test('native platform query branches still require supported relation topology', () => {
  const q = system.q
  for (const predicate of [
    q.all(q.platform('native'), q.part('Root').has('Item', 'hover')),
    q.any(q.platform('web'), q.part('Root').has('Item', 'hover')),
  ]) {
    const base = new Base({
      ref: system,
      config: { ...getConfig(), platform: 'native' },
      rules: {
        Root: {},
        Item: {},
        [predicate]: { Root: { style: { opacity: 0.5 } } },
      },
    })
    expect(() => base.mount()).toThrow(
      /nativeHost.parentOf and subscribeTopology/,
    )
  }
})
