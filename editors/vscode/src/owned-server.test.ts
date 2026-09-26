import type { ChildProcess } from 'node:child_process'
import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { expect, test } from 'vitest'
import { OwnedServer } from './owned-server.ts'
import { evictClosedSession } from './session-lifecycle.ts'

const fixtureStartupTimeout = 5_000
// OwnedServer bounds graceful cleanup (1s), SIGTERM (250ms), SIGKILL (2s),
// and failed-start cleanup (500ms). Keep those production deadlines unchanged;
// allow every intentional start/stop attempt plus fixture I/O in the outer test.
const ownedCaseBudget = (starts = 1, stops = starts) =>
  starts * fixtureStartupTimeout + stops * 4_000 + 2_000

async function fixture(
  run: (server: OwnedServer, child: ChildProcess) => Promise<void>,
  timeout = 10_000,
) {
  const directory = await mkdtemp(join(tmpdir(), 'toned-owned-server-'))
  const entrypoint = join(directory, 'hung.cjs')
  await writeFile(
    entrypoint,
    `process.on('SIGTERM', () => {}); setInterval(() => {}, 1000); process.stdout.write('ready');`,
  )
  const server = new OwnedServer(entrypoint, timeout)
  try {
    const child = await server.spawn()
    await new Promise<void>((resolve, reject) => {
      const timer = setTimeout(
        () => reject(new Error('Child fixture startup timed out')),
        fixtureStartupTimeout,
      )
      child.stdout!.once('data', () => {
        clearTimeout(timer)
        resolve()
      })
      child.once('error', (error) => {
        clearTimeout(timer)
        reject(error)
      })
    })
    await run(server, child)
  } finally {
    await server.stop()
    await rm(directory, { recursive: true, force: true })
  }
}
function reaped(child: ChildProcess) {
  expect(child.signalCode).toBe('SIGKILL')
  expect(() => process.kill(child.pid!, 0)).toThrow()
}

test(
  'initialization deadline kills and reaps a server that never answers',
  async () => {
    await fixture(async (server, child) => {
      await expect(
        server.initialize(
          () => new Promise(() => {}),
          async () => {},
        ),
      ).rejects.toThrow('timed out')
      reaped(child)
    }, 40)
  },
  ownedCaseBudget(),
)

test(
  'restart/deactivation cancels pending initialization without waiting for its deadline',
  async () => {
    await fixture(async (server, child) => {
      const ready = server.initialize(
        () => new Promise(() => {}),
        async () => {},
      )
      const stopping = server.stop()
      expect(server.stop()).toBe(stopping)
      await expect(ready).rejects.toThrow('cancelled')
      await stopping
      reaped(child)
      await expect(server.spawn()).rejects.toThrow('stopped')
    })
  },
  ownedCaseBudget(),
)

test(
  'a server ignoring shutdown and SIGTERM is forcibly reaped',
  async () => {
    await fixture(async (server, child) => {
      await server.initialize(
        async () => {},
        () => new Promise(() => {}),
      )
      await server.stop()
      reaped(child)
    })
  },
  ownedCaseBudget(),
)

test(
  'failed initialization disposes its owned child before exposing failure',
  async () => {
    await fixture(async (server, child) => {
      await expect(
        server.initialize(
          async () => {
            throw new Error('handshake failed')
          },
          async () => {},
        ),
      ).rejects.toThrow('handshake failed')
      reaped(child)
    })
  },
  ownedCaseBudget(),
)

test(
  'an unexpected process exit evicts its session and allows a fresh generation',
  async () => {
    await fixture(async (server, child) => {
      await server.initialize(
        async () => {},
        async () => {},
      )
      const sessions = new Map([['workspace', server]])
      let notices = 0
      const closed = new Promise<void>((resolve) =>
        child.once('close', () => {
          evictClosedSession(
            sessions,
            'workspace',
            server,
            server.isStopping,
            () => {
              notices++
            },
          )
          resolve()
        }),
      )
      child.kill('SIGKILL')
      await closed
      expect(sessions.size).toBe(0)
      expect(notices).toBe(1)
      await fixture(async (replacement, next) => {
        sessions.set('workspace', replacement)
        expect(
          evictClosedSession(sessions, 'workspace', server, false, () => {
            notices++
          }),
        ).toBe(false)
        expect(sessions.get('workspace')).toBe(replacement)
        expect(next.pid).not.toBe(child.pid)
        expect(
          evictClosedSession(sessions, 'workspace', replacement, true, () => {
            notices++
          }),
        ).toBe(false)
        expect(notices).toBe(1)
      })
    })
  },
  ownedCaseBudget(2),
)

test(
  'a reaped process with delayed close does not poison subsequent stops',
  async () => {
    await fixture(async (server, child) => {
      await server.initialize(
        async () => {},
        async () => {},
      )
      // Model an OS-exited process whose transport close is delayed independently.
      // The actual child still receives signals and its OS exit is asserted below.
      child.removeAllListeners('close')
      await server.stop()
      await server.stop()
      reaped(child)
    })
  },
  ownedCaseBudget(),
)

test(
  'a failed termination remains owned and a later stop retries instead of caching rejection',
  async () => {
    await fixture(async (server, child) => {
      await server.initialize(
        async () => {},
        async () => {},
      )
      const kill = child.kill.bind(child)
      // The first OS termination request stalls: keep the real child alive until retry.
      child.kill = () => true
      try {
        await expect(server.stop()).rejects.toThrow('timed out')
        expect(() => process.kill(child.pid!, 0)).not.toThrow()
      } finally {
        child.kill = kill
      }
      await server.stop()
      reaped(child)
    })
  },
  ownedCaseBudget(1, 2),
)
