/** End-to-end engine/React acceptance measurements. Run from any directory with Node. */
import { spawnSync } from 'node:child_process'
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  realpathSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('../', import.meta.url))
const hq = resolve(root, '../..')
const currentOnly = process.argv.includes('--current-only')
const rawStyle = process.argv.includes('--raw-style')
const platformStyle = process.argv.includes('--platform-style')
if (rawStyle && platformStyle)
  throw new Error('Choose one fixture: --raw-style or --platform-style')
const checkpoint =
  (currentOnly
    ? undefined
    : process.argv.slice(2).find((arg) => !arg.startsWith('--'))) ??
  'ebd10355fb9c2d7178e256e442ee24ba7526406b'
const temp = mkdtempSync(join(tmpdir(), 'toned-completion-'))
const baseline = join(temp, 'checkpoint')
if (!currentOnly) {
  mkdirSync(baseline)
  const archive = spawnSync(
    'git',
    ['archive', checkpoint, 'packages/toned-core', 'packages/toned-react'],
    { cwd: root, maxBuffer: 20 * 1024 * 1024 },
  )
  if (archive.status !== 0) throw new Error(archive.stderr.toString())
  const extract = spawnSync('tar', ['-x', '-C', baseline], {
    input: archive.stdout,
  })
  if (extract.status !== 0) throw new Error(extract.stderr.toString())
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
  symlinkSync(
    realpathSync(join(root, 'packages/toned-core/node_modules/csstype')),
    join(baseline, 'node_modules/csstype'),
  )
}
const results = []
for (const [version, source] of currentOnly
  ? [['current', root]]
  : [
      ['checkpoint', baseline],
      ['current', root],
    ]) {
  const net = join(temp, `${version}-network.log`),
    fs = join(temp, `${version}-fs.log`)
  const env = Object.fromEntries(
    Object.entries(process.env).filter(([key]) =>
      ['PATH', 'HOME', 'TMPDIR', 'LANG', 'TERM'].includes(key),
    ),
  )
  Object.assign(env, {
    NODE_ENV: 'test',
    HQ_TEST_NET_LOG: net,
    HQ_TEST_FS_LOG: fs,
  })
  const guards = [
    'test-fs-guard',
    'test-conf-mode',
    'test-db-isolate',
    'test-net-guard',
  ].flatMap((name) => ['--preload', join(hq, 'scripts/build', `${name}.ts`)])
  const start = performance.now()
  const child = spawnSync(
    'bun',
    [
      ...guards,
      join(root, 'benchmarks/completion-worker.ts'),
      source,
      version,
      temp,
      ...(rawStyle ? ['--raw-style'] : []),
      ...(platformStyle ? ['--platform-style'] : []),
    ],
    {
      cwd: hq,
      env,
      encoding: 'utf8',
      timeout: 120000,
      maxBuffer: 5 * 1024 * 1024,
    },
  )
  for (const log of [net, fs])
    if (existsSync(log) && readFileSync(log, 'utf8').trim())
      throw new Error(readFileSync(log, 'utf8'))
  if (child.status !== 0) throw new Error(child.stderr + child.stdout)
  const result = JSON.parse(child.stdout)
  writeFileSync(
    join(temp, `${version}-runtime.json`),
    JSON.stringify(result, null, 2),
  )
  const fixture = join(temp, `${version}-types.ts`)
  const parts = Array.from(
    { length: 42 },
    (_, day) => `Day${day}: { shade: 'rest' }`,
  ).join(',')
  writeFileSync(
    fixture,
    `import {defineSystem,defineToken} from ${JSON.stringify(join(source, 'packages/toned-core/index.ts'))};
const ui=defineSystem({shade:defineToken({values:['rest','selected'] as const,resolve:value=>({color:value})})});
export const sheet=ui.stylesheet({${parts}}).variants<{selected:boolean}>($=>({[$.selected(true)]:{Day0:{shade:'selected'}}}));
void sheet;`,
  )
  const timings = []
  let typeStatus, typeErrors
  const nodeGuards = [
    'test-fs-guard',
    'test-conf-mode',
    'test-db-isolate',
    'test-net-guard',
  ]
    .map((name) => `--import=${join(hq, 'scripts/build', `${name}.ts`)}`)
    .join(' ')
  for (let run = 0; run < 3; run++) {
    const start = performance.now()
    const checked = spawnSync(
      join(root, 'node_modules/.bin/tsc'),
      [
        '--ignoreConfig',
        '--noEmit',
        '--skipLibCheck',
        '--strict',
        '--target',
        'ESNext',
        '--module',
        'NodeNext',
        '--moduleResolution',
        'NodeNext',
        '--allowImportingTsExtensions',
        fixture,
      ],
      {
        cwd: hq,
        env: { ...env, NODE_OPTIONS: nodeGuards },
        encoding: 'utf8',
        timeout: 60000,
        maxBuffer: 1024 * 1024,
      },
    )
    timings.push(performance.now() - start)
    typeStatus = checked.status
    typeErrors = (checked.stdout + checked.stderr).trim()
  }
  result.typecheck_ms = Number(timings.sort((a, b) => a - b)[1].toFixed(2))
  result.typecheck_exit = typeStatus
  if (typeStatus !== 0) {
    result.typecheck_errors = typeErrors
    if (version === 'current')
      throw new Error(
        `Current representative consumer failed typecheck: ${typeErrors}`,
      )
  }
  const declarationDir = join(temp, `${version}-declarations`)
  const emitDeclaration = () =>
    spawnSync(
      join(root, 'node_modules/.bin/tsc'),
      [
        '--ignoreConfig',
        '--declaration',
        '--emitDeclarationOnly',
        '--skipLibCheck',
        '--strict',
        '--target',
        'ESNext',
        '--module',
        'NodeNext',
        '--moduleResolution',
        'NodeNext',
        '--allowImportingTsExtensions',
        '--outDir',
        declarationDir,
        fixture,
      ],
      {
        cwd: hq,
        env: { ...env, NODE_OPTIONS: nodeGuards },
        encoding: 'utf8',
        timeout: 60000,
        maxBuffer: 1024 * 1024,
      },
    )
  let emitted = emitDeclaration()
  result.declaration_emit_exit = emitted.status
  if (emitted.status !== 0) {
    result.declaration_emit_errors = (emitted.stdout + emitted.stderr).trim()
    if (version === 'current') throw new Error(result.declaration_emit_errors)
    // Preserve the unmodified consumer's failure. The checkpoint documented
    // these symbol imports as necessary for inferred declaration emission.
    // Retry that historical workaround without annotating or widening the sheet.
    writeFileSync(
      fixture,
      `import type {_internalBrand,SYMBOL_INIT,SYMBOL_REF} from ${JSON.stringify(join(source, 'packages/toned-core/types/stylesheet.ts'))};\n` +
        readFileSync(fixture, 'utf8'),
    )
    emitted = emitDeclaration()
    result.declaration_compatibility_emit_exit = emitted.status
    result.declaration_compatibility_note =
      'Historical explicit symbol type imports; sheet inference unchanged.'
    if (emitted.status !== 0)
      result.declaration_compatibility_errors = (
        emitted.stdout + emitted.stderr
      ).trim()
  }
  if (emitted.status === 0) {
    const files = readdirSync(declarationDir, { recursive: true }).filter(
      (name) => name.endsWith('.d.ts'),
    )
    const consumer = files.find((name) =>
      name.endsWith(`${version}-types.d.ts`),
    )
    if (!consumer) throw new Error('Consumer declaration was not emitted')
    result.consumer_declaration_bytes = readFileSync(
      join(declarationDir, consumer),
    ).byteLength
    if (version === 'current' && result.consumer_declaration_bytes > 64 * 1024)
      throw new Error(
        `Inferred consumer declaration exceeded 64 KiB: ${result.consumer_declaration_bytes} bytes`,
      )
    result.declaration_closure_bytes = files.reduce(
      (sum, name) => sum + readFileSync(join(declarationDir, name)).byteLength,
      0,
    )
    result.declaration_closure_files = files.length
  }
  for (const log of [net, fs])
    if (existsSync(log) && readFileSync(log, 'utf8').trim())
      throw new Error(readFileSync(log, 'utf8'))
  result.benchmark_and_typecheck_ms = Number(
    (performance.now() - start).toFixed(2),
  )
  results.push(result)
}
const report = {
  checkpoint,
  workload: platformStyle
    ? 'platform-style'
    : rawStyle
      ? 'raw-style'
      : 'scalar-tokens',
  environment: { platform: process.platform, arch: process.arch },
  fixture:
    'Synthetic 42-cell calendar: shared sheet and 42 distinct per-child override scopes; cold 43-part compilation, happy-dom React mounts, SSR/CSS and exported consumer declaration sizes; no browser layout or device measurement.',
  results,
}
writeFileSync(join(temp, 'report.json'), JSON.stringify(report, null, 2))
console.log(JSON.stringify({ ...report, evidenceDirectory: temp }, null, 2))
