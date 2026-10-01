/** Matcher microbenchmark runner. Run with Node from the repository root:
 *   node benchmarks/compare-matcher.mjs            current matcher only
 *   node benchmarks/compare-matcher.mjs <revision> also a Git revision's matcher
 * The revision is extracted with `git archive` into a temporary directory; the
 * working tree is not changed. */
import { spawnSync } from 'node:child_process'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('../', import.meta.url))
const revision = process.argv[2]
const args = [join(root, 'benchmarks/matcher.ts')]
let temp
try {
  if (revision) {
    temp = mkdtempSync(join(tmpdir(), 'toned-matcher-benchmark-'))
    // Extract the complete package so the baseline never imports current helpers.
    const archive = spawnSync(
      'git',
      ['archive', revision, 'packages/toned-core'],
      { cwd: root, maxBuffer: 64 * 1024 * 1024 },
    )
    if (archive.status !== 0) throw new Error(String(archive.stderr))
    const extract = spawnSync('tar', ['-x', '-C', temp], {
      input: archive.stdout,
    })
    if (extract.status !== 0) throw new Error(String(extract.stderr))
    args.push(
      join(temp, 'packages/toned-core/stylesheet/StyleMatcher.ts'),
      revision,
    )
  }
  const result = spawnSync('bun', args, {
    cwd: root,
    env: { ...process.env, NODE_ENV: 'test' },
    stdio: 'inherit',
    timeout: 120000,
  })
  if (result.error) throw result.error
  process.exitCode = result.status ?? 1
} finally {
  if (temp) rmSync(temp, { recursive: true, force: true })
}
