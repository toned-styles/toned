/**
 * Declared-target conformance, measured: each feature written for a system
 * that declares one target, rendered by it. The gate fails when a cell that
 * worked stops working, or when a cell the types refused (`type-error`)
 * slips back to a runtime rejection. A rejection that becomes a type error
 * is the direction of travel; update the baseline then.
 */
import { describe, expect, test } from 'vitest'

import { runDeclaredSuite } from './declared.ts'
import type { Outcome } from './matrix.ts'

const w = 'works'
const r = 'rejected'
const x = 'type-error'
const targetOrder = ['web', 'native', 'email', 'pdf'] as const

const baseline: Record<string, readonly [Outcome, Outcome, Outcome, Outcome]> =
  {
    tokens: [w, w, w, w],
    variants: [w, w, w, w],
    media: [w, w, x, x],
    'compound-condition': [w, w, x, x],
    state: [w, w, x, x],
    hover: [w, w, x, x],
    'source-channel': [w, w, x, x],
    bridge: [w, r, r, r],
    grid: [w, w, x, w],
    animation: [w, r, w, r],
    'platform-blocks': [w, w, w, w],
    'css-variable': [w, r, r, r],
    'web-rules': [w, w, x, w],
  }

describe('declared-target conformance', async () => {
  const cells = await runDeclaredSuite()

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
    '%s is no worse than its baseline',
    (_, cell) => {
      const recorded =
        baseline[cell.feature]?.[targetOrder.indexOf(cell.target as never)]
      if (recorded === 'works') expect(cell.outcome, cell.message).toBe('works')
      if (recorded === 'type-error')
        expect(cell.outcome, cell.message).toBe('type-error')
    },
  )

  test('a static target refuses conditions with a message naming the fix', () => {
    const hover = cells.find(
      (c) => c.feature === 'hover' && c.target === 'email',
    )
    expect(hover?.message).toContain('use a variant')
  })
})
