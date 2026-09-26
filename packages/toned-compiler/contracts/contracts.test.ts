import { defineSystem, defineToken } from '@toned/core'
import { createNativeRenderer } from '@toned/core/server'
import { expect, test } from 'vitest'
import { contrastRatio, createScenarios, verifyContracts } from './index.ts'

const ui = defineSystem({
  id: 'contracts',
  tokens: {
    opacity: defineToken({
      values: [0, 1],
      resolve: (opacity) => ({ opacity }),
    }),
  },
})
const sheet = ui.stylesheet({
  Root: {
    $kind: 'text',
    opacity: 1,
    $style: { color: '#000', backgroundColor: '#fff' },
  },
})
const renderer = createNativeRenderer(ui, { tokens: {} })
const resolve = () => renderer.explain(sheet)

test('finite matrices enumerate exactly and bounded sampling discloses uncovered combinations', () => {
  const dimensions = {
    variants: { size: ['s', 'm'], selected: [true, false] },
    themes: ['light', 'dark'],
    texts: ['short', 'long'],
    viewports: [{ width: 320, height: 640 }],
  } as const
  const suite = createScenarios(dimensions)
  expect(suite.coverage).toMatchObject({
    kind: 'exhaustive',
    total: '16',
    selected: 16,
  })
  expect(new Set(suite.scenarios.map((s) => JSON.stringify(s))).size).toBe(16)
  expect(() => createScenarios(dimensions, { maxScenarios: 3 })).toThrow(
    'explicitly request sampled',
  )
  const sampled = createScenarios(dimensions, {
    maxScenarios: 3,
    mode: 'sampled',
  })
  expect(sampled.coverage).toMatchObject({
    kind: 'sampled',
    total: '16',
    selected: 3,
  })
  expect(sampled.scenarios.map((s) => s.index)).toEqual(['0', '7', '15'])
  const huge = createScenarios(
    {
      variants: Object.fromEntries(
        Array.from({ length: 64 }, (_, i) => [String(i), [false, true]]),
      ),
    },
    { maxScenarios: 2, mode: 'sampled' },
  )
  expect(huge.coverage.total).toBe('18446744073709551616')
  expect(huge.scenarios).toHaveLength(2)
})

test('empty, duplicate and malformed dimensions never silently reduce coverage', () => {
  expect(() => createScenarios({ themes: [] })).toThrow()
  expect(() => createScenarios({ facts: { focus: [true, true] } })).toThrow(
    'duplicate',
  )
  expect(() =>
    createScenarios({ viewports: [{ width: 0, height: 1 }] }),
  ).toThrow('positive')
  expect(() => createScenarios({}, { maxScenarios: Infinity })).toThrow()
})

test('real renderer provenance accompanies measured counterexamples and counters stay exact when truncated', async () => {
  const result = await verifyContracts({
    suite: createScenarios({ texts: ['short', 'long'] }),
    contracts: [
      {
        id: 'target',
        kind: 'interaction-size',
        part: 'Root',
        minWidth: 44,
        minHeight: 44,
      },
      { id: 'overflow', kind: 'overflow', part: 'Root' },
    ],
    resolve,
    measure: () => ({
      Root: { width: 20, height: 20, overflowX: 4, overflowY: 0 },
    }),
    maxFindings: 1,
  })
  expect(result).toMatchObject({
    status: 'fail',
    failed: 4,
    omittedFindings: 3,
  })
  expect(result.findings[0]?.origins[0]?.part).toBe('Root')
  expect(result.findings[0]?.scenario.text).toBe('short')
  expect(result.findings[0]?.evidence['width']).toBe(20)
})

test('missing measurements and unsupported color representations are inconclusive, never success', async () => {
  expect(contrastRatio('#000', '#fff')).toBe(21)
  expect(contrastRatio('rgba(0,0,0,0.5)', '#fff')).toBeUndefined()
  const result = await verifyContracts({
    suite: createScenarios({}),
    resolve,
    contracts: [
      {
        id: 'target',
        kind: 'interaction-size',
        part: 'Root',
        minWidth: 44,
        minHeight: 44,
      },
    ],
  })
  expect(result.status).toBe('inconclusive')
  const contrast = await verifyContracts({
    suite: createScenarios({}),
    resolve,
    measure: () => ({ Root: { foreground: '#000', background: '#fff' } }),
    contracts: [{ id: 'text', kind: 'contrast', part: 'Root', minRatio: 4.5 }],
  })
  expect(contrast.status).toBe('pass')
})

test('focus and reduced motion require evidence only in selected fact scenarios', async () => {
  const result = await verifyContracts({
    suite: createScenarios({
      facts: { focus: [false, true], reduced: [false, true] },
    }),
    resolve,
    contracts: [
      {
        id: 'focus',
        kind: 'focus',
        part: 'Root',
        when: { fact: 'focus', equals: true },
      },
      {
        id: 'motion',
        kind: 'reduced-motion',
        part: 'Root',
        when: { fact: 'reduced', equals: true },
        maxDurationMs: 0,
      },
    ],
    measure: () => ({ Root: { focusVisible: true, motionDurationMs: 0 } }),
  })
  expect(result).toMatchObject({ status: 'pass', passed: 4, skipped: 4 })
})

test('resolution failures and cancellation do not produce false pass reports', async () => {
  const result = await verifyContracts({
    suite: createScenarios({}),
    resolve: () => {
      throw new Error('unavailable')
    },
    contracts: [
      { id: 'contrast', kind: 'contrast', part: 'Root', minRatio: 7 },
    ],
  })
  expect(result.findings[0]).toMatchObject({
    status: 'inconclusive',
    reason: 'resolution-or-measurement-error',
    evidence: { error: 'unavailable' },
  })
  const abort = new AbortController()
  abort.abort()
  await expect(
    verifyContracts({
      suite: createScenarios({}),
      resolve,
      contracts: [],
      signal: abort.signal,
    }),
  ).rejects.toThrow()
})

test('omitted condition dimensions and malformed policies cannot yield successful verification', async () => {
  const result = await verifyContracts({
    suite: createScenarios({}),
    resolve,
    contracts: [
      {
        id: 'focus',
        kind: 'focus',
        part: 'Root',
        when: { fact: 'focus', equals: true } as never,
      },
    ],
    measure: () => ({ Root: { focusVisible: true } }),
  })
  expect(result).toMatchObject({
    status: 'inconclusive',
    skipped: 0,
    inconclusive: 1,
  })
  expect(result.findings[0]?.reason).toBe('missing-condition-fact')
  await expect(
    verifyContracts({
      suite: createScenarios({}),
      resolve,
      contracts: [{ id: 'bad', kind: 'typo', part: 'Root' }] as never,
    }),
  ).rejects.toThrow('malformed')
})
