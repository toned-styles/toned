import { expect, it } from 'vitest'
import { defineSystem, defineTokenFor } from '../index.ts'
import { createNativeRenderer } from '../server/index.ts'

it('typed token factories retain normal resolver validation and dynamic behavior', () => {
  const token = defineTokenFor<{ step: number }>()
  const gap = token({
    values: [0],
    dynamic: 'number',
    properties: ['gap'],
    resolve: (value, theme) => ({ gap: value * theme.step }),
  })
  const ui = defineSystem({
    id: 'typed-theme-runtime',
    tokens: { gap },
    themes: { default: { step: 4 } },
  })
  const sheet = ui.stylesheet({ Root: { gap: 2.5 } })
  expect(
    createNativeRenderer(ui, { tokens: { step: 4 } }).resolve(sheet).Root.style[
      'gap'
    ],
  ).toBe(10)
  const invalid = token({
    values: [0],
    properties: ['gap'],
    resolve: (value) => ({ opacity: value }),
  })
  expect(() => invalid.resolve(0, { step: 4 })).toThrow(
    /undeclared field opacity/,
  )
})

it('portable typed outputs lower structured values and typed theme references', async () => {
  const { dp, percent, rgba, themeRef } = await import('../index.ts')
  type Theme = { step: number; ink: string }
  const reference = themeRef<Theme>()
  const token = defineTokenFor<Theme>()({
    values: ['regular'],
    resolve: () => ({
      gap: reference('step'),
      paddingInline: dp(12),
      width: percent(50),
      backgroundColor: rgba(1, 2, 3),
      color: reference('ink'),
    }),
  })
  const ui = defineSystem({
    id: 'typed-portable-output',
    tokens: { appearance: token },
  })
  const sheet = ui.stylesheet({
    Root: { $kind: 'text', appearance: 'regular' },
  })
  const output = createNativeRenderer(ui, {
    tokens: { step: 4, ink: 'red' },
  }).resolve(sheet).Root.style
  expect(output).toMatchObject({
    gap: 4,
    paddingLeft: 12,
    paddingRight: 12,
    width: '50%',
    backgroundColor: 'rgba(1, 2, 3, 1)',
    color: 'red',
  })
})
