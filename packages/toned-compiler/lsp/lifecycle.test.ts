import { mkdir, mkdtemp, realpath, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { PassThrough } from 'node:stream'
import { pathToFileURL } from 'node:url'
import { expect, test } from 'vitest'
import {
  createConnection,
  createProtocolConnection,
  ProposedFeatures,
  StreamMessageReader,
  StreamMessageWriter,
} from 'vscode-languageserver/node.js'
import { DesignProject } from '../project.ts'
import { registerLanguageServer } from './server.ts'
import { DesignLanguageService } from './service.ts'

const source = 'const s=ui.stylesheet({Root:{gap:1}})'
const delay = () => new Promise((resolve) => setTimeout(resolve, 10))
async function until(check: () => boolean) {
  for (let n = 0; n < 100; n++) {
    if (check()) return
    await delay()
  }
  expect(check()).toBe(true)
}

test('disk inclusion, open-buffer recovery and edit versions follow the real protocol', async () => {
  const directory = await realpath(
    await mkdtemp(join(tmpdir(), 'toned-lsp-lifecycle-')),
  )
  const root = pathToFileURL(directory).href
  const uri = pathToFileURL(join(directory, 'styles.ts')).href
  await writeFile(join(directory, 'styles.ts'), source)
  const incoming = new PassThrough(),
    outgoing = new PassThrough()
  const server = createConnection(
    ProposedFeatures.all,
    new StreamMessageReader(incoming),
    new StreamMessageWriter(outgoing),
  )
  const service = new DesignLanguageService(
    new DesignProject({ maxNodesPerDocument: 12 }),
  )
  const registration = registerLanguageServer(server, service)
  const client = createProtocolConnection(
    new StreamMessageReader(outgoing),
    new StreamMessageWriter(incoming),
  )
  server.listen()
  client.listen()
  try {
    await client.sendRequest('initialize', {
      processId: null,
      rootUri: root,
      capabilities: {},
    })
    await client.sendNotification('initialized', {})
    await until(() => Boolean(service.project.get(uri)))
    const propose = async () => {
      const node = service.project.query({ uri, kind: 'declaration' }).items[0]!
      return client.sendRequest('toned/proposeEdit', {
        nodeId: node.id,
        value: 2,
        expectedVersion: service.project.get(uri)!.version,
        scope: { uri, owner: 's' },
      })
    }
    expect(await propose()).toMatchObject({
      workspaceEdit: {
        documentChanges: [{ textDocument: { uri, version: null } }],
      },
    })
    await client.sendNotification('textDocument/didOpen', {
      textDocument: { uri, languageId: 'typescript', version: 7, text: source },
    })
    await client.sendRequest('toned/inspect', { uri })
    expect(await propose()).toMatchObject({
      workspaceEdit: {
        documentChanges: [{ textDocument: { uri, version: 7 } }],
      },
    })
    const tooMany =
      'const s=ui.stylesheet({Root:{' +
      Array.from({ length: 20 }, (_, n) => `p${n}:${n}`).join(',') +
      '}})'
    await client.sendNotification('textDocument/didChange', {
      textDocument: { uri, version: 8 },
      contentChanges: [{ text: tooMany }],
    })
    expect(await client.sendRequest('toned/inspect', { uri })).toMatchObject({
      total: 0,
    })
    expect(registration.documents.get(uri)?.getText()).toBe(tooMany)
    await client.sendNotification('workspace/didChangeWatchedFiles', {
      changes: [{ uri, type: 2 }],
    })
    await delay()
    expect(service.project.get(uri)).toBeUndefined()
    await client.sendNotification('textDocument/didChange', {
      textDocument: { uri, version: 9 },
      contentChanges: [{ text: source.replace('gap:1', 'gap:2') }],
    })
    await client.sendRequest('toned/inspect', { uri })
    expect(service.project.get(uri)?.text).toContain('gap:2')
    await client.sendNotification('textDocument/didChange', {
      textDocument: { uri, version: 10 },
      contentChanges: [{ text: ' '.repeat(1_000_001) }],
    })
    expect(await client.sendRequest('toned/inspect', { uri })).toMatchObject({
      total: 0,
    })
    expect(registration.documents.get(uri)?.getText()).toBe('')
    await client.sendNotification('workspace/didChangeWatchedFiles', {
      changes: [{ uri, type: 2 }],
    })
    await delay()
    expect(service.project.get(uri)).toBeUndefined()
    await client.sendNotification('textDocument/didChange', {
      textDocument: { uri, version: 11 },
      contentChanges: [{ text: source }],
    })
    await client.sendRequest('toned/inspect', { uri })
    expect(await propose()).toMatchObject({
      workspaceEdit: {
        documentChanges: [{ textDocument: { uri, version: 11 } }],
      },
    })
    for (const name of [
      'dist/file.js',
      'node_modules/pkg/file.ts',
      '.next/file.ts',
      'out/file.ts',
      'file.test.ts',
      'types.d.ts',
    ]) {
      const file = join(directory, name),
        excludedUri = pathToFileURL(file).href
      await mkdir(join(file, '..'), { recursive: true })
      await writeFile(file, source)
      await client.sendNotification('workspace/didChangeWatchedFiles', {
        changes: [{ uri: excludedUri, type: 1 }],
      })
      await client.sendNotification('textDocument/didOpen', {
        textDocument: {
          uri: excludedUri,
          languageId: 'typescript',
          version: 1,
          text: source,
        },
      })
      await client.sendRequest('toned/inspect', { uri: excludedUri })
      await client.sendNotification('textDocument/didClose', {
        textDocument: { uri: excludedUri },
      })
    }
    const includedUri = pathToFileURL(join(directory, 'new.ts')).href
    await writeFile(join(directory, 'new.ts'), source)
    await client.sendNotification('workspace/didChangeWatchedFiles', {
      changes: [{ uri: includedUri, type: 1 }],
    })
    await until(() => Boolean(service.project.get(includedUri)))
    expect(service.project.uris().sort()).toEqual([uri, includedUri].sort())
  } finally {
    registration.dispose()
    client.dispose()
    server.dispose()
    incoming.destroy()
    outgoing.destroy()
    await rm(directory, { recursive: true, force: true })
  }
})
