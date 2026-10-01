import { defineSystem } from '@toned/core'
import { createNativeRenderer } from '@toned/core/server'
import { describe, expect, test } from 'vitest'

import { bottom, left, right, top } from './layout.ts'

const system = defineSystem({ top, left, right, bottom })

describe('base inset tokens', () => {
  test.each([
    '64px',
    '50%',
    '-1rem',
    'calc(100% - 8px)',
    'var(--header-height)',
    'auto',
  ])('preserves the CSS literal %s for every inset', (value) => {
    const input = { top: value, left: value, right: value, bottom: value }
    const result = system.exec(
      { tokens: {}, useClassName: false, platform: 'web' },
      input,
    )
    expect(result.style).toEqual(input)
  })

  test('keeps numeric spacing steps and named spacing aliases', () => {
    const sheet = system.stylesheet({ Root: { top: 4, left: 'roomy' } })
    const result = createNativeRenderer(system, {
      tokens: { base: 4, space_roomy: 40 },
    }).resolve(sheet)
    expect(result.Root.style).toEqual({ top: 16, left: 40 })
  })
})
