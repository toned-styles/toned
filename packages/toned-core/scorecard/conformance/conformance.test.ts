/**
 * Target conformance, measured. The baseline is today's matrix. The gate
 * fails when a cell that worked stops working, or when a feature or target
 * appears without a baseline. A rejection that becomes a type error is the
 * direction of travel (targets on the system); update the baseline then.
 */
import { describe, expect, test } from 'vitest'

import type { Outcome } from './matrix.ts'
import { runConformanceSuite } from './suite.ts'

const w = 'works'
const r = 'rejected'
const targetOrder = ['web', 'native', 'inline', 'pdf'] as const

const baseline: Record<string, readonly [Outcome, Outcome, Outcome, Outcome]> =
  {
    tokens: [w, w, w, w],
    variants: [w, w, w, w],
    media: [w, w, r, r],
    'compound-condition': [w, w, r, r],
    state: [w, w, r, r],
    hover: [w, w, r, r],
    'source-channel': [w, w, r, r],
    bridge: [w, r, r, r],
    grid: [w, w, r, w],
    animation: [w, r, w, r],
    'platform-blocks': [w, w, w, w],
    'css-variable': [w, r, r, r],
    'web-rules': [w, w, r, w],
  }

describe('target conformance', async () => {
  const cells = await runConformanceSuite()

  test('every cell has a baseline', () => {
    const missing = cells.filter(
      (c) => !baseline[c.feature] || !targetOrder.includes(c.target as never),
    )
    expect(missing).toEqual([])
    expect(cells).toHaveLength(
      Object.keys(baseline).length * targetOrder.length,
    )
  })

  test.each(cells.map((c) => [`${c.feature} on ${c.target}`, c] as const))(
    '%s still works if it worked',
    (_, cell) => {
      const recorded =
        baseline[cell.feature]?.[targetOrder.indexOf(cell.target as never)]
      if (recorded === 'works') expect(cell.outcome, cell.message).toBe('works')
    },
  )
})
