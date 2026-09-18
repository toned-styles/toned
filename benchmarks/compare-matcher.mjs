import { spawnSync } from 'node:child_process'
import { existsSync, mkdtempSync, readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('../', import.meta.url))
const checkpoint = process.argv[2] ?? 'ebd10355fb9c2d7178e256e442ee24ba7526406b'
const output = mkdtempSync(join(tmpdir(), 'toned-matcher-benchmark-'))
// Newer baselines split matching into modules; extract the complete package so
// a comparison never accidentally imports current helpers into the baseline.
const matcherPath = 'packages/toned-core/stylesheet/StyleMatcher.ts'
const paths = ['packages/toned-core']
const archive = spawnSync('git', ['archive', checkpoint, ...paths], {
  cwd: root,
  maxBuffer: 20 * 1024 * 1024,
})
if (archive.status !== 0) throw new Error(archive.stderr.toString())
const extract = spawnSync('tar', ['-x', '-C', output], {
  input: archive.stdout,
})
if (extract.status !== 0) throw new Error(extract.stderr.toString())

const hq = resolve(root, '../..')
const env = Object.fromEntries(
  Object.entries(process.env).filter(([key]) =>
    ['PATH', 'HOME', 'TMPDIR', 'LANG', 'TERM'].includes(key),
  ),
)
const networkLog = join(output, 'network.log')
const filesystemLog = join(output, 'filesystem.log')
Object.assign(env, {
  NODE_ENV: 'test',
  HQ_TEST_NET_LOG: networkLog,
  HQ_TEST_FS_LOG: filesystemLog,
})
const preloadNames = [
  'test-fs-guard.ts',
  'test-conf-mode.ts',
  'test-db-isolate.ts',
  'test-net-guard.ts',
]
const preloads = existsSync(join(hq, 'scripts/build/test-net-guard.ts'))
  ? preloadNames.flatMap((name) => [
      '--preload',
      join(hq, 'scripts/build', name),
    ])
  : []
const result = spawnSync(
  'bun',
  [...preloads, join(root, 'benchmarks/matcher.ts'), join(output, matcherPath)],
  {
    cwd: hq,
    env,
    stdio: 'inherit',
    timeout: 60000,
  },
)
for (const log of [networkLog, filesystemLog])
  if (existsSync(log) && readFileSync(log, 'utf8').trim())
    throw new Error(readFileSync(log, 'utf8'))
if (result.error) throw result.error
process.exitCode = result.status ?? 1
