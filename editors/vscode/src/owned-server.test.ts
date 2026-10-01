import type { ChildProcess } from 'node:child_process'
import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { expect, test, vi } from 'vitest'

import { OwnedServer } from './owned-server.ts'
import { evictClosedSession } from './session-lifecycle.ts'

const fixtureStartupTimeout = 5_000
// These advance durations mirror OwnedServer.finish() in owned-server.ts:
// SIGTERM's bounded(this.closed, 250), then SIGKILL's bounded(this.closed, 2_000).
const gracefulExitDeadline = 250
const forcedExitDeadline = 2_000

async function emergencyReap(child: ChildProcess) {
  // An assertion can abandon a stop whose fake deadline was discarded. Cleanup
  // must own the real process directly instead of awaiting that cached promise.
  vi.useRealTimers()
  if (child.exitCode !== null || child.signalCode !== null) return
  const pid = child.pid
  if (pid === undefined) throw new Error('Fixture child has no PID')
  await new Promise<void>((resolve, reject) => {
    const closed = () => {
      clearTimeout(timer)
      resolve()
    }
    const timer = setTimeout(() => {
      child.off('close', closed)
      if (child.exitCode !== null || child.signalCode !== null) resolve()
      else reject(new Error('Fixture emergency termination timed out'))
    }, forcedExitDeadline)
    child.once('close', closed)
    // Some cases replace child.kill to simulate failed termination. Bypass that
    // test double so a failed assertion cannot strand its owned OS process.
    try {
      process.kill(pid, 'SIGKILL')
    } catch (error) {
      clearTimeout(timer)
      child.off('close', closed)
      reject(error)
    }
  })
}
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
  let child: ChildProcess | undefined
  try {
    child = await server.spawn()
    const ownedChild = child
    await new Promise<void>((resolve, reject) => {
      const timer = setTimeout(
        () => reject(new Error('Child fixture startup timed out')),
        fixtureStartupTimeout,
      )
      ownedChild.stdout!.once('data', () => {
        clearTimeout(timer)
        resolve()
      })
      ownedChild.once('error', (error) => {
        clearTimeout(timer)
        reject(error)
      })
    })
    await run(server, child)
    await server.stop()
  } catch (error) {
    if (child) {
      try {
        await emergencyReap(child)
      } catch (cleanupError) {
        throw new AggregateError(
          [error, cleanupError],
          'Fixture failed and emergency cleanup failed',
          { cause: error },
        )
      }
    }
    throw error
  } finally {
    await rm(directory, { recursive: true, force: true })
  }
}
// Start real children and await their readiness before replacing deadline timers.
// Signals, exit events and reaping remain real; only intentionally expired waits
// advance virtually. Keep one complete shutdown integration on the real clock.
async function withControlledDeadlines(run: () => Promise<void>) {
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })
  try {
    await run()
  } finally {
    vi.useRealTimers()
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
      await withControlledDeadlines(async () => {
        await Promise.all([
          expect(
            server.initialize(
              () => new Promise(() => {}),
              async () => {},
            ),
          ).rejects.toThrow('timed out'),
          vi.advanceTimersByTimeAsync(40 + gracefulExitDeadline),
        ])
        reaped(child)
      })
    }, 40)
  },
  ownedCaseBudget(),
)

test(
  'restart/deactivation cancels pending initialization without waiting for its deadline',
  async () => {
    await fixture(async (server, child) => {
      await withControlledDeadlines(async () => {
        const ready = server.initialize(
          () => new Promise(() => {}),
          async () => {},
        )
        const stopping = server.stop()
        expect(server.stop()).toBe(stopping)
        await Promise.all([
          expect(ready).rejects.toThrow('cancelled'),
          vi.advanceTimersByTimeAsync(gracefulExitDeadline),
        ])
        await stopping
        reaped(child)
        await expect(server.spawn()).rejects.toThrow('stopped')
      })
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
      await withControlledDeadlines(async () => {
        await Promise.all([
          expect(
            server.initialize(
              async () => {
                throw new Error('handshake failed')
              },
              async () => {},
            ),
          ).rejects.toThrow('handshake failed'),
          vi.advanceTimersByTimeAsync(gracefulExitDeadline),
        ])
        reaped(child)
      })
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
      await withControlledDeadlines(async () => {
        const exited = new Promise<void>((resolve) =>
          child.once('exit', () => resolve()),
        )
        const stopping = server.stop()
        await vi.advanceTimersByTimeAsync(gracefulExitDeadline)
        // Let the OS actually reap the child before expiring the transport wait.
        await exited
        await vi.advanceTimersByTimeAsync(forcedExitDeadline)
        await stopping
        await server.stop()
        reaped(child)
      })
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
      await withControlledDeadlines(async () => {
        const kill = child.kill.bind(child)
        // The first OS termination request stalls: keep the real child alive until retry.
        child.kill = () => true
        try {
          await Promise.all([
            expect(server.stop()).rejects.toThrow('timed out'),
            vi.advanceTimersByTimeAsync(
              gracefulExitDeadline + forcedExitDeadline,
            ),
          ])
          expect(() => process.kill(child.pid!, 0)).not.toThrow()
        } finally {
          child.kill = kill
        }
        const stopping = server.stop()
        await vi.advanceTimersByTimeAsync(gracefulExitDeadline)
        await stopping
        reaped(child)
      })
    })
  },
  ownedCaseBudget(1, 2),
)

test(
  'a failed assertion during virtual shutdown reaps the child and preserves the failure',
  async () => {
    let ownedChild: ChildProcess | undefined
    let closed = false
    let assertion: unknown
    let observed: unknown
    await fixture(async (server, child) => {
      ownedChild = child
      child.once('close', () => {
        closed = true
      })
      await server.initialize(
        async () => {},
        () => new Promise(() => {}),
      )
      await withControlledDeadlines(async () => {
        // Fail while graceful cleanup still waits on a fake deadline. The helper
        // restores the real clock before fixture cleanup receives the failure.
        void server.stop().catch(() => {})
        try {
          expect('actual').toBe('expected')
        } catch (error) {
          assertion = error
          throw error
        }
      })
    }).catch((error) => {
      observed = error
    })
    expect(assertion).toBeInstanceOf(Error)
    expect(observed).toBe(assertion)
    expect(vi.isFakeTimers()).toBe(false)
    expect(closed).toBe(true)
    if (!ownedChild) throw new Error('Fixture never started')
    reaped(ownedChild)
  },
  ownedCaseBudget(),
)
