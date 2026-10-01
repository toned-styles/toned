import { createHash } from 'node:crypto'

import { expect, test } from 'vitest'

import { sourceRevision } from './source.ts'

test.each([
  '',
  'const padding = 16',
  'Toned 🎨 café 日本語',
  '\ud800',
  'a'.repeat(10000),
])('portable source revisions preserve existing SHA-256 identity', (source) => {
  expect(sourceRevision(source)).toBe(
    createHash('sha256').update(source).digest('hex'),
  )
})
