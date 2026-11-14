import { fileURLToPath } from 'node:url'

import { describe, expect, test } from 'vitest'

import { runCorpus } from './runner.ts'

const fixtures = fileURLToPath(
  new URL('./runner-fixtures/cases', import.meta.url),
)

describe('corpus runner', async () => {
  const results = await runCorpus(fixtures)
  const byId = Object.fromEntries(results.map((r) => [r.id, r]))

  test('a TypeScript diagnostic in the case file is a compile catch', () => {
    expect(byId['fixture-compile']).toMatchObject({ stage: 'compile' })
    expect(byId['fixture-compile']?.message).toMatch(/^TS\d+: /)
  })
  test('a message naming the fix is recognised, one that does not is not', () => {
    expect(byId['fixture-compile']?.namesFix).toBe(true)
    expect(byId['fixture-runtime-throw']?.namesFix).toBe(false)
  })
  test('a toned lint rule reporting in the case file is a lint catch', () => {
    expect(byId['fixture-lint']).toMatchObject({
      stage: 'lint',
      namesFix: true,
    })
    expect(byId['fixture-lint']?.message).toMatch(
      /^toned\(no-shadowing-spread\): /,
    )
  })
  test('an error thrown while building CSS is a build catch', () => {
    expect(byId['fixture-build']).toMatchObject({ stage: 'build' })
  })
  test('a throw from the case\'s own build step (an output build) is a build catch', () => {
    expect(byId['fixture-build-probe']).toMatchObject({
      stage: 'build',
      namesFix: true,
    })
  })
  test('a throw or a console warning at runtime is a runtime catch', () => {
    expect(byId['fixture-runtime-throw']).toMatchObject({ stage: 'runtime' })
    expect(byId['fixture-runtime-warn']).toMatchObject({
      stage: 'runtime',
      namesFix: true,
    })
  })
  test('nothing reported is silent', () => {
    expect(byId['fixture-silent']).toMatchObject({
      stage: 'silent',
      namesFix: false,
    })
  })
  test('a stage later than the baseline is a regression, an earlier one is not', () => {
    expect(byId['fixture-silent']?.regressed).toBe(false)
    expect(byId['fixture-regressed']?.regressed).toBe(true)
    expect(byId['fixture-compile']?.regressed).toBe(false)
  })
})
