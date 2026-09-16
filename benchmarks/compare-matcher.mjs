import { spawnSync } from 'node:child_process'
import { existsSync, mkdtempSync, readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('../', import.meta.url))
const checkpoint = process.argv[2] ?? 'ebd10355fb9c2d7178e256e442ee24ba7526406b'
const output = mkdtempSync(join(tmpdir(), 'toned-matcher-benchmark-'))
const paths = [
  'packages/toned-core/stylesheet/StyleMatcher.ts',
  'packages/toned-core/stylesheet/crossHover.ts',
  'packages/toned-core/utils/mergeStyle.ts',
  'packages/toned-core/utils/warn.ts',
]
const archive = spawnSync('git', ['archive', checkpoint, ...paths], {
  cwd: root,
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
Object.assign(env, { NODE_ENV: 'test', HQ_TEST_NET_LOG: networkLog })
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
  [...preloads, join(root, 'benchmarks/matcher.ts'), join(output, paths[0])],
  {
    cwd: hq,
    env,
    stdio: 'inherit',
    timeout: 60000,
  },
)
if (existsSync(networkLog) && readFileSync(networkLog, 'utf8').trim())
  throw new Error(readFileSync(networkLog, 'utf8'))
if (result.error) throw result.error
process.exitCode = result.status ?? 1
