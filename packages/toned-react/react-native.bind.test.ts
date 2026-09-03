import { describe, expect, test } from 'vitest'
import nativeConfig from './react-native.ts'

/**
 * The native binding's `resolveElement` seam. toned-react ships NO native
 * default (it has no react-native dependency), so the seam exists to be
 * overridden by a native host (`@lib/haelo-primitives`) via setConfig. Until
 * one is installed it throws with guidance rather than render a wrong element —
 * this test pins that behavior so the seam cannot silently become a no-op.
 */
describe('react-native resolveElement seam', () => {
  test('throws host-install guidance rather than returning a bad element', () => {
    expect(() => nativeConfig.resolveElement?.('view')).toThrow(
      /host resolveElement/i,
    )
  })
})
