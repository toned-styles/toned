import { EventEmitter } from 'node:events'
import { mkdtemp, readFile, realpath, rm, writeFile } from 'node:fs/promises'
import {
  createServer,
  type IncomingMessage,
  type ServerResponse,
} from 'node:http'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { PassThrough } from 'node:stream'
import { pathToFileURL } from 'node:url'
import { afterEach, expect, test } from 'vitest'
import type { DesignNode, DesignPage } from '../model.ts'
import {
  createSourceBridge,
  createSourceBridgeHandler,
  sourceBridgePlugin,
} from './index.ts'

const cleanups: (() => Promise<void>)[] = []
afterEach(async () => {
  for (const cleanup of cleanups.splice(0)) await cleanup()
})
async function setup() {
  const root = await realpath(await mkdtemp(join(tmpdir(), 'toned-http-'))),
    path = join(root, 'styles.ts')
  await writeFile(
    path,
    'const styles = ui.stylesheet({ Root: { padding: 1 } })',
  )
  const bridge = await createSourceBridge({ root, files: ['styles.ts'] })
  const token = 'test-only-owned-capability-'.repeat(2)
  let origin = ''
  const server = createServer(
    createSourceBridgeHandler(bridge, {
      origin: () => origin,
      token,
      maxBodyBytes: 4096,
    }),
  )
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve))
  origin = `http://127.0.0.1:${(server.address() as { port: number }).port}`
  cleanups.push(async () => {
    server.closeAllConnections()
    await new Promise<void>((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve())),
    )
    await bridge.dispose()
    await rm(root, { recursive: true, force: true })
  })
  const call = async (
    method: string,
    input: unknown,
    headers: Record<string, string> = {},
  ) => {
    const response = await fetch(`${origin}/__toned/source`, {
      method: 'POST',
      headers: {
        Origin: origin,
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        ...headers,
      },
      body: JSON.stringify({ method, input }),
    })
    return {
      status: response.status,
      payload: (await response.json()) as { result: unknown; error?: string },
    }
  }
  return {
    root,
    path,
    uri: pathToFileURL(path).href,
    bridge,
    origin,
    token,
    call,
  }
}

test('owned HTTP server provides real query/proposal/apply source roundtrip', async () => {
  const { call, path, uri } = await setup()
  const page = await call('query', { kind: 'declaration', limit: 10 })
  expect(page.status).toBe(200)
  const node = (page.payload.result as DesignPage<DesignNode>).items[0]!
  const proposal = await call('propose', {
    nodeId: node.id,
    expectedVersion: 1,
    scope: { uri, owner: 'styles', path: ['Root'] },
    value: 2,
  })
  expect(proposal.status).toBe(200)
  expect((await call('apply', proposal.payload.result)).status).toBe(200)
  expect(await readFile(path, 'utf8')).toContain('padding: 2')
})

test('HTTP boundary rejects wrong origin, missing capability, oversized bodies and malformed requests', async () => {
  const { call, path } = await setup()
  expect(
    (await call('query', {}, { Origin: 'https://other.example' })).status,
  ).toBe(403)
  expect((await call('query', {}, { Authorization: '' })).status).toBe(401)
  expect((await call('query', { name: 'x'.repeat(5000) })).status).toBe(413)
  expect((await call('query', { kind: 'typo' })).status).toBe(400)
  expect(
    (
      await call('apply', {
        proposalId: 'not-issued',
        edit: { after: 'arbitraryCode()' },
      })
    ).status,
  ).toBe(400)
  expect(await readFile(path, 'utf8')).toContain('padding: 1')
})

test('Vite adapter is serve-only and disposes its bridge through middleware-mode close', async () => {
  const { root, origin } = await setup()
  const plugin = sourceBridgePlugin({ root, files: ['styles.ts'], origin })
  expect(plugin.apply).toBe('serve')
  const id = plugin.resolveId('virtual:toned-source-bridge')!
  expect(plugin.load(id)).toContain('/__toned/source')
  const handlers: unknown[] = []
  const install = await plugin.configureServer({
    middlewares: {
      use: (handler) => {
        handlers.push(handler)
      },
    },
    httpServer: null,
  })
  expect(handlers).toHaveLength(0)
  install()
  expect(handlers).toHaveLength(1)
  await plugin.closeBundle()
})

test('late operation settlement cannot write a second response after a timeout', async () => {
  const { bridge } = await setup()
  let release: ((page: DesignPage<DesignNode>) => void) | undefined
  const delayed = {
    ...bridge,
    query: () =>
      new Promise<DesignPage<DesignNode>>((resolve) => {
        release = resolve
      }),
  }
  const token = 'x'.repeat(32)
  const handler = createSourceBridgeHandler(delayed, {
    token,
    origin: 'http://localhost',
    requestTimeoutMs: 10,
  })
  const request = Object.assign(new PassThrough(), {
    method: 'POST',
    url: '/__toned/source',
    headers: {
      origin: 'http://localhost',
      authorization: `Bearer ${token}`,
      'content-type': 'application/json',
    },
  })
  let ended = 0,
    headers = 0
  let complete: (() => void) | undefined
  const finished = new Promise<void>((resolve) => {
    complete = resolve
  })
  // ServerResponse can be writableEnded while its socket is not yet destroyed.
  const response = Object.assign(new EventEmitter(), {
    destroyed: false,
    writableEnded: false,
    statusCode: 200,
    setHeader() {
      headers++
    },
    end() {
      ended++
      response.writableEnded = true
      complete!()
    },
  })
  handler(
    request as unknown as IncomingMessage,
    response as unknown as ServerResponse,
  )
  request.end(JSON.stringify({ method: 'query', input: {} }))
  await finished
  expect(response.statusCode).toBe(408)
  release!({ items: [], total: 0, revision: 0 })
  await new Promise((resolve) => setTimeout(resolve, 10))
  expect(ended).toBe(1)
  expect(headers).toBe(3)
})
