import { describe, expect, test } from 'vitest'
import {
  prepareHostRelease,
  recordHostCommit,
  releaseHost,
  setStyles,
} from './applyStyles.ts'
import {
  defineReactNativeHost,
  nativeHostAdapter,
  registerNativeHost,
} from './native-host.ts'

describe('declared native host capabilities', () => {
  test('an unrelated setNativeProps member never opts a target in', () => {
    expect(() =>
      setStyles({ setNativeProps() {} }, { style: { opacity: 1 } }),
    ).toThrow(/declared native host/)
  })
  test('adapter identity checks reject composites and do not claim another renderer', () => {
    class Host {
      setNativeProps() {}
    }
    const adapter = defineReactNativeHost({
      renderer: 'fabric',
      version: 'fixture',
      isHost: (host) => host instanceof Host,
    })
    expect(adapter.id).toBe('react-native/fixture/fabric')
    expect(() => registerNativeHost({ setNativeProps() {} }, adapter)).toThrow(
      /Host rejected/,
    )
    const host = new Host()
    const first = registerNativeHost(host, adapter)
    const second = registerNativeHost(host, adapter)
    first()
    first()
    expect(nativeHostAdapter(host)).toBe(adapter)
    second()
    expect(nativeHostAdapter(host)).toBeUndefined()
  })
  test('custom adapters define their own removal values for style and props', () => {
    const host = {}
    const patches: unknown[] = []
    registerNativeHost(host, {
      id: 'custom/v1',
      renderer: 'custom',
      version: '1',
      accepts: (value) => value === host,
      patch: (_, patch) => patches.push(patch),
      resetStyle: (key) => `reset:${key}`,
      resetProp: (key) => `clear:${key}`,
    })
    recordHostCommit(
      host,
      { style: { opacity: 1 }, selectionColor: 'red' },
      { style: { width: 10 } },
    )
    setStyles(host, { style: { opacity: 0 }, selectionColor: 'blue' })
    setStyles(host, {})
    expect(patches).toEqual([
      { style: { opacity: 0 }, selectionColor: 'blue' },
      {
        style: { opacity: 'reset:opacity' },
        selectionColor: 'clear:selectionColor',
      },
    ])
  })
})

test('native ref cleanup restores the committed declaration before host takeover', () => {
  const live: Record<string, unknown> = { opacity: 1, color: 'blue' }
  const host = {
    setNativeProps: (patch: { style?: Record<string, unknown> }) =>
      Object.assign(live, patch.style),
  }
  const adapter = defineReactNativeHost({
    renderer: 'fabric',
    version: 'fixture',
    isHost: (value) => value === host,
  })
  registerNativeHost(host, adapter)
  const owner = {}
  recordHostCommit(
    host,
    { style: { opacity: 1 } },
    { style: { color: 'blue' } },
    owner,
  )
  setStyles(host, { style: { opacity: 0, width: 10 } }, owner)
  prepareHostRelease(host, owner)
  expect(live).toEqual({ opacity: 1, color: 'blue', width: null })
  live['color'] = 'green' // next React declaration, after callback-ref cleanup
  releaseHost(host, owner)
  expect(live['color']).toBe('green')
})
