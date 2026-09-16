import type { NativeHostAdapter } from '@toned/core/stylesheet'

const fixtureNativeHost: NativeHostAdapter = {
  id: 'toned-react-test/merge-patch',
  renderer: 'custom',
  version: '1',
  accepts: (host) =>
    typeof (host as { setNativeProps?: unknown }).setNativeProps === 'function',
  patch: (host, props) =>
    (host as { setNativeProps(props: unknown): void }).setNativeProps(props),
  resetStyle: () => null,
  resetProp: () => null,
}

import { defineSystem } from '@toned/core'
import { Base } from '@toned/core/stylesheet'
import { describe, expect, test } from 'vitest'
import native from './react-native.ts'

function setup() {
  const base = new Base({
    ref: defineSystem({}),
    rules: {
      Root: {
        style: { opacity: 1 },
        ':hover': {
          style: { color: 'red', '--toned-b-placeholder-color': 'green' },
        },
      },
    },
    config: {
      ...native,
      nativeHost: fixtureNativeHost,
      getTokens: () => ({}),
      useClassName: false,
      mediaMode: false,
    },
  })
  return { base, props: native.getProps.call(base, 'Root') as any }
}

describe('native host patch contract', () => {
  test('direct hover patches reset dropped fields and bridge props without redundant writes', () => {
    const { base, props } = setup()
    const patches: unknown[] = []
    const host = { setNativeProps: (patch: unknown) => patches.push(patch) }
    const detach = props.ref(host)
    const unmount = base.mount()
    expect(patches).toEqual([])
    props.onHoverIn()
    props.onHoverIn()
    props.onHoverOut()
    expect(patches).toEqual([
      { style: { color: 'red' }, placeholderTextColor: 'green' },
      { style: { color: null }, placeholderTextColor: null },
    ])
    detach()
    unmount()
  })

  test('unsupported refs fail at the native binding boundary', () => {
    const { props } = setup()
    expect(() => props.ref({})).toThrow(/Host rejected/)
  })
})

test('the default native binding rejects unsupported backend values even for legacy systems', () => {
  expect(() =>
    new Base({
      ref: defineSystem({}),
      config: { ...native, getTokens: () => ({}) },
      rules: { Root: { style: { color: 'rgb(from red r g b / 50%)' } } },
    }).getCurrentStyle('Root'),
  ).toThrow(/CSS-only value/)
  expect(() =>
    new Base({
      ref: defineSystem({}),
      config: { ...native, getTokens: () => ({}) },
      rules: { Root: { style: { cursor: 'pointer' } } },
    }).getCurrentStyle('Root'),
  ).toThrow(/unsupported style field cursor/)
})
