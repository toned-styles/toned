import { expect, test } from 'vitest'
import { buildStyles } from '../build/index.ts'
import { createNativeRenderer, createWebRenderer } from '../server/index.ts'
import { defineSystem, defineToken } from '../system/definers.ts'
import { resolveAlphaChannels } from './resolve.ts'

for (const direction of ['ltr', 'rtl'] as const) {
  test(`logical alpha channels follow the physical output (${direction})`, () => {
    const target = direction === 'ltr' ? 'borderLeftColor' : 'borderRightColor'
    const ui = defineSystem({
      id: `logical-alpha-${direction}`,
      layout: { direction },
      tokens: {
        paint: defineToken({
          values: ['red'],
          alphaChannel: ['borderInlineStartColor', target],
          resolve: () => ({ borderInlineStartColor: '#ff0000' }),
        }),
      },
    })
    const sheet = ui.stylesheet({ Root: { paint: 'red/50' } })
    expect(
      createNativeRenderer(ui, { tokens: {} }).resolve(sheet).Root.style,
    ).toEqual({ [target]: 'rgba(255, 0, 0, 0.5)' })
    const artifact = buildStyles(ui, { sheets: [sheet] })
    const physical =
      direction === 'ltr' ? 'border-left-color' : 'border-right-color'
    expect(artifact.css).toContain(`alpha-${physical}`)
    expect(artifact.css).not.toContain('alpha-border-inline-start-color')
    expect(artifact.css).toContain(`${physical}:rgb(from #ff0000`)
    const output = createWebRenderer(ui, {
      tokens: {},
      manifest: artifact.manifest,
    }).resolve(sheet).Root
    expect(JSON.stringify(output)).not.toContain('border-inline-start')
    // An off-grid fraction must use the same physical CSS parameter as the
    // generated class, rather than inventing a parameter the class never reads.
    const dynamic = ui.stylesheet({ Root: { paint: 'red/37' } })
    const parameterOutput = createWebRenderer(ui, {
      tokens: {},
      manifest: artifact.manifest,
    }).resolve(dynamic).Root
    expect(
      Object.entries(parameterOutput.style).some(
        ([key, value]) =>
          key.endsWith(`alpha-${physical}`) && String(value) === '0.37',
      ),
    ).toBe(true)
  })
}

test('logical alpha shorthands expand once, including overlapping explicit channels', () => {
  expect(
    resolveAlphaChannels(['borderInlineColor', 'borderLeftColor'], {
      direction: 'rtl',
    }),
  ).toEqual(['borderRightColor', 'borderLeftColor'])
})

test('legacy web retains inherited logical CSS fields and matching alpha parameters', () => {
  const tokens = {
    edge: defineToken({
      values: [true],
      resolve: () => ({ marginInlineStart: 4, marginInlineEnd: 8 }),
    }),
    paint: defineToken({
      values: ['red'],
      alphaChannel: ['borderInlineStartColor'],
      resolve: () => ({ borderInlineStartColor: '#ff0000' }),
    }),
  }
  const ui = defineSystem(tokens)
  const sheet = ui.stylesheet({ Root: { edge: true, paint: 'red/37' } })
  const artifact = buildStyles(ui, { sheets: [sheet] })
  expect(artifact.css).toContain(
    'margin-inline-start:4px;margin-inline-end:8px',
  )
  expect(artifact.css).toContain('border-inline-start-color:rgb(from #ff0000')
  expect(artifact.css).toContain('--toned-alpha-border-inline-start-color')
  expect(artifact.css).not.toContain('margin-left:')
  const output = createWebRenderer(ui, {
    tokens: {},
    manifest: artifact.manifest,
  }).resolve(sheet).Root
  expect(output.style).toMatchObject({
    '--toned-alpha-border-inline-start-color': '0.37',
  })
  const native = createNativeRenderer(ui, { tokens: {} }).resolve(sheet).Root
    .style
  expect(native).toEqual({
    marginLeft: 4,
    marginRight: 8,
    borderLeftColor: 'rgba(255, 0, 0, 0.37)',
  })

  const fixed = defineSystem(tokens, { layoutContext: { direction: 'rtl' } })
  const fixedSheet = fixed.stylesheet({ Root: { edge: true, paint: 'red/37' } })
  const fixedArtifact = buildStyles(fixed, { sheets: [fixedSheet] })
  expect(fixedArtifact.css).toContain('margin-right:4px;margin-left:8px')
  expect(fixedArtifact.css).toContain('--toned-alpha-border-right-color')
})
