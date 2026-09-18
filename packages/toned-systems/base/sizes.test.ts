import { defineSystem } from '@toned/core'
import { createNativeRenderer } from '@toned/core/server'
import { describe, expect, test } from 'vitest'
import * as sizes from './sizes.ts'

// Match the compatibility base system's unnamespaced declarations.
const system = defineSystem(sizes)

describe('base dimension tokens', () => {
  test.each([
    '2.25rem',
    '240px',
    '50%',
    '100dvh',
    '12cqw',
    'calc(100% - 2rem)',
    'var(--panel-width)',
    'clamp(10px, 50vw, 100px)',
  ])('preserves the CSS literal %s for every dimension', (value) => {
    const input = {
      width: value,
      minWidth: value,
      maxWidth: value,
      height: value,
      minHeight: value,
      maxHeight: value,
    }
    const result = system.exec(
      { tokens: {}, useClassName: false, platform: 'web' },
      input,
    )
    expect(result.style).toEqual(input)
  })

  test('keeps numeric spacing steps and named spacing aliases', () => {
    const sheet = system.stylesheet({ Root: { width: 4, height: 'roomy' } })
    const result = createNativeRenderer(system, {
      tokens: { base: 4, space_roomy: 40 },
    }).resolve(sheet)
    expect(result.Root.style).toEqual({ width: 16, height: 40 })
  })

  test('allows portable percentages but diagnoses CSS-only native dimensions', () => {
    const renderer = createNativeRenderer(system, { tokens: {} })
    expect(
      renderer.resolve(system.stylesheet({ Root: { width: '50%' } })).Root
        .style,
    ).toEqual({ width: '50%' })
    for (const value of [
      '2.25rem',
      '240px',
      'calc(100% - 2rem)',
      'var(--panel-width)',
    ]) {
      expect(() =>
        renderer.resolve(system.stylesheet({ Root: { height: value } })),
      ).toThrow(/Toned native backend/)
    }
  })
})
