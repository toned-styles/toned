import { expect, test } from 'vitest'
import { connectNativeMedia } from './media.native.ts'
import type { NativeHostAdapter } from './native-host.ts'

function fixture() {
  let width = 300
  let notify = () => {}
  let stopped = false
  const adapter: NativeHostAdapter = {
    id: 'fixture/viewport',
    renderer: 'custom',
    version: '1',
    accepts: () => true,
    patch() {},
    resetStyle: () => null,
    resetProp: () => null,
    getViewportWidth: () => width,
    subscribeViewport: (listener) => {
      notify = listener
      return () => {
        stopped = true
      }
    },
  }
  return {
    adapter,
    resize: (next: number) => {
      width = next
      notify()
    },
    stopped: () => stopped,
  }
}
test('native viewport changes emit only changed logical facts, including negation and OR', () => {
  const host = fixture(),
    changes: unknown[] = []
  const media = connectNativeMedia(
    { md: 600, lg: '900px' },
    ['@md', '@!md', '@md|lg'],
    host.adapter,
    (value) => changes.push(value),
  )
  expect(media.state).toEqual({
    '@md': false,
    '@lg': false,
    '@!md': true,
    '@md|lg': false,
  })
  host.resize(400)
  expect(changes).toEqual([])
  host.resize(650)
  expect(changes).toEqual([
    { '@md': true, '@lg': false, '@!md': false, '@md|lg': true },
  ])
  media.stop()
  expect(host.stopped()).toBe(true)
})
test('native media capability errors are explicit and container-only sheets require no viewport subscription', () => {
  expect(() =>
    connectNativeMedia({ md: 600 }, ['@md'], undefined, () => {}),
  ).toThrow(/getViewportWidth and subscribeViewport/)
  const host = fixture()
  expect(() =>
    connectNativeMedia(
      { md: '(prefers-reduced-motion)' },
      ['@md'],
      host.adapter,
      () => {},
    ),
  ).toThrow(/raw queries/)
  expect(() =>
    connectNativeMedia({ md: '40rem' }, ['@md'], host.adapter, () => {}),
  ).toThrow(/numeric logical-width/)
  expect(
    connectNativeMedia({}, ['@card/wide'], undefined, () => {}).state,
  ).toEqual({})
})

test('native controller construction is pure and viewport facts publish only at commit', async () => {
  const { Base } = await import('./StyleSheet.ts')
  const { defineSystem } = await import('../system/definers.ts')
  const { getConfig } = await import('../system/config.ts')
  const host = fixture()
  let reads = 0
  const original = host.adapter.getViewportWidth!
  const adapter = {
    ...host.adapter,
    getViewportWidth: () => {
      reads++
      return original()
    },
  }
  const system = defineSystem({
    id: 'native-viewport',
    tokens: {},
    conditions: { media: { md: 600 } },
  })
  const base = new Base({
    ref: system,
    config: {
      ...getConfig(),
      platform: 'native',
      nativeHost: adapter,
      mediaMode: 'runtime',
      pseudoMode: 'runtime',
      useClassName: false,
    },
    rules: {
      Root: { style: { opacity: 1 }, '@md': { style: { opacity: 0.5 } } },
    },
  })
  expect(reads).toBe(0)
  const stop = base.mount()
  expect(base.getCurrentStyle('Root').style.opacity).toBe(1)
  host.resize(650)
  expect(base.getCurrentStyle('Root').style.opacity).toBe(0.5)
  stop()
  expect(host.stopped()).toBe(true)
})
