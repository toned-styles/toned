/**
 * Build purity, measured. Today `buildStyles` takes the sheets as input, so a
 * sheet can change the outputs; the baseline records which outputs each
 * mutation changes. The gate fails only when a mutation changes an output it
 * did not change before. When one becomes pure, shrink its baseline.
 */
import { describe, expect, test } from 'vitest'

import { runPuritySuite } from './suite.ts'

const baseline: Record<string, readonly ('css' | 'manifest')[]> = {
  'add-token-sheet': [],
  'edit-token-value': [],
  'delete-sheet': [],
  'add-compound-condition': [],
  'add-local-media': ['css', 'manifest'],
  'add-source-channel': [],
  'add-context-sheets': [],
  'add-web-rules': ['css', 'manifest'],
  'add-derived-sheet': ['css', 'manifest'],
}

describe('build purity', () => {
  const results = runPuritySuite()

  test('every mutation has a recorded baseline', () => {
    expect(results.map((r) => r.id).sort()).toEqual(
      Object.keys(baseline).sort(),
    )
  })

  test.each(results.map((r) => [r.id, r] as const))(
    '%s changes no output beyond its baseline',
    (id, result) => {
      const changed = result.changes.map((change) => change.output)
      const beyond = changed.filter((output) => !baseline[id]?.includes(output))
      expect(beyond, JSON.stringify(result.changes).slice(0, 2000)).toEqual([])
    },
  )
})
