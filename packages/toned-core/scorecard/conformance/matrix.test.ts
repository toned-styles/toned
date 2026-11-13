import { fileURLToPath } from 'node:url'

import { describe, expect, test } from 'vitest'

import { features } from './matrix-fixtures/features.ts'
import { targets } from './matrix-fixtures/targets.ts'
import { buildMatrix } from './matrix.ts'

const path = (file: string) =>
  fileURLToPath(new URL(`./matrix-fixtures/${file}`, import.meta.url))

describe('conformance matrix builder', async () => {
  const cells = await buildMatrix({
    features,
    targets,
    featuresModule: path('features.ts'),
    targetsModule: path('targets.ts'),
  })
  const at = (feature: string, target: string) =>
    cells.find((c) => c.feature === feature && c.target === target)

  test('one cell per feature and target', () => {
    expect(cells).toHaveLength(6)
  })
  test('a resolve that neither throws nor warns works', () => {
    expect(at('ok', 'loose')).toMatchObject({ outcome: 'works' })
    expect(at('ok', 'throws')).toMatchObject({ outcome: 'works' })
  })
  test('a runtime refusal is recorded with its message', () => {
    expect(at('bad', 'throws')).toMatchObject({
      outcome: 'rejected',
      message: 'Error: bad is not supported here',
    })
  })
  test('a target whose types refuse the sheet is a type error, even if it would run', () => {
    expect(at('bad', 'strict')).toMatchObject({
      outcome: 'type-error',
      runtime: 'works',
    })
    expect(at('bad', 'strict')?.message).toMatch(/^TS\d+/)
    expect(at('ok', 'strict')).toMatchObject({ outcome: 'works' })
  })
})
