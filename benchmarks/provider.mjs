/** Explicit-provider React runtime measurements. Run with Node from the
 * repository root:
 *   node benchmarks/provider.mjs [revision] [--pairs=N]
 * Without a revision only the current sources are measured. A revision is
 * extracted with `git archive` into a temporary directory and resolved against
 * this checkout's React installation; the working tree is not changed. With a
 * revision, each pair alternates which version runs first. */
import { spawn, spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import {
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  realpathSync,
  rmSync,
  symlinkSync,
} from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('../', import.meta.url))
const revision = process.argv.slice(2).find((arg) => !arg.startsWith('--'))
const pairs = Number(
  process.argv.find((arg) => arg.startsWith('--pairs='))?.slice(8) ?? 1,
)
if (!Number.isInteger(pairs) || pairs < 1 || pairs > 20)
  throw new Error('--pairs must be 1..20')
const command = (args, options = {}) => {
  const result = spawnSync(args[0], args.slice(1), {
    cwd: root,
    maxBuffer: 64 * 1024 * 1024,
    ...options,
  })
  if (result.status !== 0) throw new Error(String(result.stderr))
  return result.stdout
}
/** Digest of the measured runtime sources, so a report identifies them exactly. */
function digest() {
  const hash = createHash('sha256')
  for (const pkg of ['toned-core', 'toned-react']) {
    const dir = join(root, 'packages', pkg)
    for (const file of readdirSync(dir, { recursive: true })
      .filter(
        (name) =>
          !name
            .split('/')
            .some((part) => ['node_modules', '.dist', '.tsc'].includes(part)) &&
          /\.(ts|tsx|json)$/.test(name),
      )
      .sort()) {
      hash.update(`${pkg}/${file}\0`)
      hash.update(readFileSync(join(dir, file)))
    }
  }
  return hash.digest('hex')
}
/** Runs one worker with bounded time and output. */
async function measure(source, version) {
  const child = spawn(
    'bun',
    [join(root, 'benchmarks/provider-worker.ts'), source, version],
    {
      cwd: root,
      env: { ...process.env, NODE_ENV: 'test' },
      stdio: ['ignore', 'pipe', 'pipe'],
    },
  )
  let stdout = '',
    stderr = '',
    bytes = 0,
    overflow = false
  const capture = (data, error) => {
    bytes += data.length
    if (bytes > 8 * 1024 * 1024) {
      overflow = true
      child.kill('SIGKILL')
      return
    }
    if (error) stderr += data
    else stdout += data
  }
  child.stdout.on('data', (data) => capture(data, false))
  child.stderr.on('data', (data) => capture(data, true))
  const timer = setTimeout(() => child.kill('SIGKILL'), 120000)
  const code = await new Promise((done, reject) => {
    child.on('error', reject)
    child.on('exit', done)
  }).finally(() => clearTimeout(timer))
  if (overflow) throw new Error('Provider benchmark output exceeded 8 MiB')
  if (code !== 0) throw new Error(stderr + stdout)
  return JSON.parse(stdout)
}

const temp = mkdtempSync(join(tmpdir(), 'toned-provider-')),
  baseline = join(temp, 'baseline')
try {
  if (revision) {
    mkdirSync(baseline)
    command(['tar', '-x', '-C', baseline], {
      input: command([
        'git',
        'archive',
        revision,
        'packages/toned-core',
        'packages/toned-react',
      ]),
    })
    mkdirSync(join(baseline, 'node_modules/@toned'), { recursive: true })
    symlinkSync(
      join(baseline, 'packages/toned-core'),
      join(baseline, 'node_modules/@toned/core'),
    )
    for (const name of ['react', 'react-dom', 'happy-dom', '@types'])
      symlinkSync(
        realpathSync(join(root, 'packages/toned-react/node_modules', name)),
        join(baseline, 'node_modules', name),
      )
  }
  const sourceDigest = digest()
  const results = []
  for (let pair = 0; pair < pairs; pair++) {
    const versions = !revision
      ? [['current', root]]
      : pair % 2
        ? [
            ['current', root],
            ['baseline', baseline],
          ]
        : [
            ['baseline', baseline],
            ['current', root],
          ]
    for (const [version, source] of versions)
      results.push({ pair, ...(await measure(source, version)) })
  }
  if (digest() !== sourceDigest)
    throw new Error('Runtime sources changed during measurement; rerun')
  const report = {
    baseline: revision
      ? String(command(['git', 'rev-parse', revision])).trim()
      : null,
    sourceDigest,
    environment: {
      bun: String(command(['bun', '--version'])).trim(),
      platform: process.platform,
      arch: process.arch,
    },
    fixture:
      'Actual TonedProvider/createElements 42/250-cell lists; equivalent fresh arrays, rerenders, variants, theme, interaction, SSR, explicit t spread, declared native JS host patches and disposed-controller WeakRefs. Happy-dom timings are not browser layout or device timings.',
    results,
  }
  console.log(JSON.stringify(report, null, 2))
} finally {
  rmSync(temp, { recursive: true, force: true })
}
