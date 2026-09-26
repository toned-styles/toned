/** Run the standalone fixture in a fresh, owned VS Code process and profile. */
import { spawn } from 'node:child_process'
import { cp, mkdtemp, realpath, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

const executable = process.env['VSCODE_EXECUTABLE_PATH']
if (!executable)
  throw new Error(
    'Set VSCODE_EXECUTABLE_PATH to an installed VS Code GUI executable; this runner never downloads an editor.',
  )
if (process.platform === 'win32')
  throw new Error(
    'The isolated editor runner currently requires POSIX process-group cleanup (macOS or Linux).',
  )
const root = fileURLToPath(new URL('./', import.meta.url))
const owned = await realpath(
  await mkdtemp(join(tmpdir(), 'toned-editor-test-')),
)
const workspace = join(owned, 'workspace')
let child: ReturnType<typeof spawn> | undefined
let closed: Promise<void> | undefined
let timeout: ReturnType<typeof setTimeout> | undefined
try {
  await cp(join(root, 'fixture'), workspace, { recursive: true })
  const env = { ...process.env }
  delete env['ELECTRON_RUN_AS_NODE']
  child = spawn(
    executable,
    [
      workspace,
      '--user-data-dir',
      join(owned, 'user'),
      '--extensions-dir',
      join(owned, 'extensions'),
      '--extensionDevelopmentPath',
      root,
      '--extensionTestsPath',
      join(root, 'dist/extension-test.cjs'),
      '--disable-gpu',
      '--skip-welcome',
      '--skip-release-notes',
      '--disable-workspace-trust',
      '--disable-extension',
      'vscode.typescript-language-features',
    ],
    { env, detached: true, stdio: ['ignore', 'pipe', 'pipe'] },
  )
  let output = ''
  const collect = (chunk: Buffer) => {
    output = (output + chunk.toString()).slice(-65_536)
  }
  child.stdout!.on('data', collect)
  child.stderr!.on('data', collect)
  closed = new Promise<void>((resolve) => child!.once('close', () => resolve()))
  const exit = new Promise<number | null>((resolve, reject) => {
    child!.once('error', reject)
    child!.once('exit', resolve)
  })
  const code = await Promise.race([
    exit,
    new Promise<never>((_, reject) => {
      timeout = setTimeout(
        () => reject(new Error('Editor acceptance exceeded 120 seconds')),
        120_000,
      )
    }),
  ])
  console.log(output)
  if (code !== 0 || !output.includes('Toned real VS Code acceptance passed:'))
    throw new Error(`Standalone VS Code acceptance failed (exit ${code})`)
} finally {
  clearTimeout(timeout)
  if (child?.pid && child.exitCode === null && child.signalCode === null) {
    // Only the process group created by this runner; never a user's editor instance.
    process.kill(-child.pid, 'SIGKILL')
  }
  if (closed) {
    let cleanupTimer: ReturnType<typeof setTimeout> | undefined
    try {
      await Promise.race([
        closed,
        new Promise<never>((_, reject) => {
          cleanupTimer = setTimeout(
            () =>
              reject(
                new Error(
                  `Editor cleanup timed out; profile retained at ${owned}`,
                ),
              ),
            5_000,
          )
        }),
      ])
    } finally {
      clearTimeout(cleanupTimer)
    }
  }
  await rm(owned, { recursive: true, force: true })
}
