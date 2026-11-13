import { describe, expect, test } from 'vitest'

import { diffBuild, measurePurity, type SheetSet } from './purity.ts'

const output = (css: string, manifest: object) => ({ css, manifest })

describe('build diff', () => {
  test('identical outputs have no changes', () => {
    const a = output('.a{gap:4px}', { conditions: [] })
    expect(diffBuild(a, a)).toEqual([])
  })

  test('reports added and removed CSS rules and changed manifest fields', () => {
    const before = output('.a{gap:4px}', { conditions: [], fingerprint: '1' })
    const after = output('.a{gap:4px}.b{gap:8px}', {
      conditions: ['@>=600px'],
      fingerprint: '2',
    })
    expect(diffBuild(before, after)).toEqual([
      { output: 'css', added: ['.b{gap:8px}'], removed: [] },
      { output: 'manifest', fields: ['conditions', 'fingerprint'] },
    ])
  })
})

describe('purity measurement', () => {
  const sheets: SheetSet = { a: () => 'A', b: () => 'B' }
  const mutations = [
    {
      id: 'add',
      description: 'add c',
      apply: (s: SheetSet) => ({ ...s, c: () => 'C' }),
    },
    {
      id: 'delete',
      description: 'delete a',
      apply: (sheets: SheetSet) =>
        Object.fromEntries(
          Object.entries(sheets).filter(([name]) => name !== 'a'),
        ),
    },
  ]

  test('a build that reads its sheets is impure for every mutation', () => {
    const reads = (set: SheetSet) =>
      output(
        Object.values(set)
          .map((make) => `.${String(make())}{}`)
          .join(''),
        {},
      )
    const results = measurePurity(reads, sheets, mutations)
    expect(results.map((r) => [r.id, r.pure])).toEqual([
      ['add', false],
      ['delete', false],
    ])
    expect(results[0]?.changes[0]).toMatchObject({
      output: 'css',
      added: ['.C{}'],
    })
  })

  test('a build from the system alone is pure', () => {
    const systemOnly = () => output('.gap_1{gap:4px}', { conditions: [] })
    const results = measurePurity(systemOnly, sheets, mutations)
    expect(results.every((r) => r.pure)).toBe(true)
  })
})
