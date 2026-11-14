/**
 * Build purity, measured. The build reads only the system declaration, so no
 * supported-API mutation may change an output. The deprecated `$webRules`
 * extension generates CSS from sheet content; its baseline records which
 * outputs it changes, and the gate fails only when that grows.
 */
import { describe, expect, test } from 'vitest'

import { runPuritySuite } from './suite.ts'

const deprecatedBaseline: Record<string, readonly ('css' | 'manifest')[]> = {
  'add-web-rules': ['css', 'manifest'],
}

describe('build purity', () => {
  const results = runPuritySuite()
  const supported = results.filter((r) => !r.deprecated)
  const deprecated = results.filter((r) => r.deprecated)

  test('the suite covers nine supported-API mutations', () => {
    expect(supported.map((r) => r.id).sort()).toEqual([
      'add-compound-condition',
      'add-container-width',
      'add-context-sheets',
      'add-derived-sheet',
      'add-local-media',
      'add-source-channel',
      'add-token-sheet',
      'delete-sheet',
      'edit-token-value',
    ])
  })

  test.each(supported.map((r) => [r.id, r] as const))(
    '%s changes no output',
    (_id, result) => {
      expect(
        result.changes,
        JSON.stringify(result.changes).slice(0, 2000),
      ).toEqual([])
    },
  )

  test('every deprecated-API mutation has a recorded baseline', () => {
    expect(deprecated.map((r) => r.id).sort()).toEqual(
      Object.keys(deprecatedBaseline).sort(),
    )
  })

  test.each(deprecated.map((r) => [r.id, r] as const))(
    '%s (deprecated API) changes no output beyond its baseline',
    (id, result) => {
      const changed = result.changes.map((change) => change.output)
      const beyond = changed.filter(
        (output) => !deprecatedBaseline[id]?.includes(output),
      )
      expect(beyond, JSON.stringify(result.changes).slice(0, 2000)).toEqual([])
    },
  )
})
