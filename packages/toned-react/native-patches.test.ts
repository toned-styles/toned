import { describe, expect, test } from 'vitest'
import { defineSystem } from '@toned/core'
import { Base } from '@toned/core/stylesheet'
import native from './react-native.ts'

function setup() {
  const base = new Base({
    ref: defineSystem({}),
    rules: {
      Root: {
        style: { opacity: 1 },
        ':hover': { style: { color: 'red', '--toned-b-placeholder-color': 'green' } },
      },
    },
    config: { ...native, getTokens: () => ({}), useClassName: false, mediaMode: false },
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
    expect(() => props.ref({})).toThrow(/setNativeProps/)
  })
})
