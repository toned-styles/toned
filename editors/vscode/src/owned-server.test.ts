import type { ChildProcess } from 'node:child_process'
import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { expect, test } from 'vitest'
import { OwnedServer } from './owned-server.ts'

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
        5_000,
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

test('initialization deadline kills and reaps a server that never answers', async () => {
  await fixture(async (server, child) => {
    await expect(
      server.initialize(
        () => new Promise(() => {}),
        async () => {},
      ),
    ).rejects.toThrow('timed out')
    reaped(child)
  }, 40)
})

test('restart/deactivation cancels pending initialization without waiting for its deadline', async () => {
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
})

test('a server ignoring shutdown and SIGTERM is forcibly reaped', async () => {
  await fixture(async (server, child) => {
    await server.initialize(
      async () => {},
      () => new Promise(() => {}),
    )
    await server.stop()
    reaped(child)
  })
})

test('failed initialization disposes its owned child before exposing failure', async () => {
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
})
