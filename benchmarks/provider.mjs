/** Run with Bun from HQ: guarded paired actual-provider acceptance and timings. */
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
  writeFileSync,
} from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  assertGuardLog,
  assertLegProof,
  guardPreload,
  guardProofs,
  isolatedEnvironment,
  proofServer,
} from '../../../scripts/build/test-toned.ts'

const root = fileURLToPath(new URL('../', import.meta.url)),
  hq = resolve(root, '../..')
const currentOnly = process.argv.includes('--current-only')
const checkpoint =
  process.argv.slice(2).find((arg) => !arg.startsWith('--')) ?? '7e3944c'
const pairs = Number(
  process.argv.find((arg) => arg.startsWith('--pairs='))?.slice(8) ?? 1,
)
if (!Number.isInteger(pairs) || pairs < 1 || pairs > 20)
  throw new Error('--pairs must be 1..20')
const temp = mkdtempSync(join(tmpdir(), 'toned-provider-')),
  baseline = join(temp, 'baseline')
const command = (args, options = {}) => {
  const result = spawnSync(args[0], args.slice(1), {
    cwd: root,
    maxBuffer: 32 * 1024 * 1024,
    ...options,
  })
  if (result.status !== 0) throw new Error(String(result.stderr))
  return result.stdout
}
let owned
try {
  if (!currentOnly) {
    mkdirSync(baseline)
    command(['tar', '-x', '-C', baseline], {
      input: command([
        'git',
        'archive',
        checkpoint,
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
  function digest() {
    const hash = createHash('sha256')
    for (const pkg of ['toned-core', 'toned-react']) {
      const dir = join(root, 'packages', pkg)
      for (const file of readdirSync(dir, { recursive: true })
        .filter(
          (name) =>
            !name
              .split('/')
              .some((part) =>
                ['node_modules', '.dist', '.tsc'].includes(part),
              ) && /\.(ts|tsx|json)$/.test(name),
        )
        .sort()) {
        hash.update(`${pkg}/${file}\0`)
        hash.update(readFileSync(join(dir, file)))
      }
    }
    return hash.digest('hex')
  }
  const sourceDigest = digest()
  owned = await proofServer()
  const net = join(temp, 'network.log'),
    fs = join(temp, 'filesystem.log')
  const guards = guardPreload(
    hq,
    temp,
    owned.url,
    join(hq, '.toned-guard-probe'),
  )
  const env = isolatedEnvironment(hq, net, fs, guards.preload)
  const results = []
  for (let pair = 0; pair < pairs; pair++) {
    const versions = currentOnly
      ? [['current', root]]
      : pair % 2
        ? [
            ['current', root],
            ['checkpoint', baseline],
          ]
        : [
            ['checkpoint', baseline],
            ['current', root],
          ]
    for (const [version, source] of versions) {
      const leg = `provider-${pair}-${version}`
      const child = spawn(
        'bun',
        [
          '--preload',
          guards.preload,
          join(root, 'benchmarks/provider-worker.ts'),
          source,
          version,
        ],
        {
          cwd: hq,
          env: { ...env, HQ_TONED_LEG: leg },
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
      assertLegProof(guards.proof, leg, child.pid)
      if (overflow) throw new Error('Provider benchmark output exceeded 8 MiB')
      if (code !== 0) throw new Error(stderr + stdout)
      results.push({ pair, ...JSON.parse(stdout) })
    }
  }
  if (digest() !== sourceDigest)
    throw new Error(
      'Runtime sources changed during measurement; rerun after source freeze',
    )
  const proofs = guardProofs(guards.proof)
  assertGuardLog(
    net,
    new Set(proofs.map((proof) => `${proof.netKind}:${proof.netTarget}`)),
    'network',
  )
  assertGuardLog(
    fs,
    new Set(proofs.map((proof) => `mkdirSync:${proof.fsTarget}`)),
    'filesystem',
  )
  const report = {
    checkpoint: currentOnly
      ? null
      : String(command(['git', 'rev-parse', checkpoint])).trim(),
    current: String(command(['git', 'rev-parse', 'HEAD'])).trim(),
    sourceDigest,
    environment: {
      bun: Bun.version,
      platform: process.platform,
      arch: process.arch,
    },
    guardProofs: proofs.length,
    fixture:
      'Actual TonedProvider/createElements 42/250-cell lists; equivalent fresh arrays, rerenders, variants, theme, interaction, SSR, explicit t spread, declared native JS host patches and disposed-controller WeakRefs. Happy-dom timings are not browser layout or device timings.',
    results,
  }
  const directory = join(hq, 'out/toned-validation')
  mkdirSync(directory, { recursive: true })
  const receipt = join(directory, `provider-runtime-${Date.now()}.json`)
  writeFileSync(receipt, JSON.stringify(report, null, 2))
  console.log(JSON.stringify({ ...report, receipt }, null, 2))
} finally {
  owned?.server.close()
  rmSync(temp, { recursive: true, force: true })
}
