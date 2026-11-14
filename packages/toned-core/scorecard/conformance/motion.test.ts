/**
 * Motion conformance, measured: colour, transform and state-keyed motion on
 * each declared target. The gate fails when a cell that worked stops
 * working, or when a type error slips back to a runtime rejection.
 */
import { describe, expect, test } from 'vitest'

import type { Outcome } from './matrix.ts'
import { runMotionSuite } from './motion.ts'

const w = 'works'
const x = 'type-error'
const targetOrder = ['web', 'native', 'email', 'pdf'] as const

const baseline: Record<string, readonly [Outcome, Outcome, Outcome, Outcome]> =
  {
    'motion-colour': [w, w, x, x],
    'motion-transform': [w, w, x, x],
    'motion-state': [w, w, x, x],
  }

describe('motion conformance', async () => {
  const cells = await runMotionSuite()

  test('every cell has a baseline', () => {
    expect(
      cells.filter(
        (c) => !baseline[c.feature] || !targetOrder.includes(c.target as never),
      ),
    ).toEqual([])
    expect(cells).toHaveLength(
      Object.keys(baseline).length * targetOrder.length,
    )
  })

  test.each(cells.map((c) => [`${c.feature} on ${c.target}`, c] as const))(
    '%s is no worse than its baseline',
    (_, cell) => {
      const recorded =
        baseline[cell.feature]?.[targetOrder.indexOf(cell.target as never)]
      if (recorded === 'works') expect(cell.outcome, cell.message).toBe('works')
      if (recorded === 'type-error')
        expect(cell.outcome, cell.message).toBe('type-error')
    },
  )

  test('a static-only system refuses motion with a message naming the fix', () => {
    const cell = cells.find(
      (c) => c.feature === 'motion-state' && c.target === 'email',
    )
    expect(cell?.message).toContain('Show the end state with a variant')
    expect(cell?.runtime).toBe('rejected')
  })
})
