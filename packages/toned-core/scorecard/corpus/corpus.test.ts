/**
 * The mistake corpus gate. It measures every case and fails only when a case
 * is caught later than its recorded baseline (or stops naming the fix):
 * known-silent cases are the measured starting point, not failures. When a
 * case improves, raise its baseline in the case file so it cannot slip back.
 */
import { readdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

import { describe, expect, test } from 'vitest'

import { runCorpus } from './runner.ts'

const dir = fileURLToPath(new URL('./cases', import.meta.url))

describe('mistake corpus', async () => {
  const results = await runCorpus(dir)

  test('every case file holds one case whose id is its file name', () => {
    const files = readdirSync(dir).filter((name) => name.endsWith('.ts'))
    expect(results.map((r) => `${r.id}.ts`).sort()).toEqual(files.sort())
  })

  test.each(results.map((r) => [r.id, r] as const))(
    '%s is caught no later than its baseline',
    (_, result) => {
      const detail = `${result.id}: now ${result.stage}${result.namesFix ? ' (names the fix)' : ''}, baseline ${result.baseline.stage}${result.baseline.namesFix ? ' (names the fix)' : ''}${result.message ? `\n${result.message}` : ''}`
      expect(result.regressed, detail).toBe(false)
    },
  )
})
