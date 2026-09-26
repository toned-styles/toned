import { mkdir, mkdtemp, realpath, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { PassThrough } from 'node:stream'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { describe, expect, it } from 'vitest'
import {
  createConnection,
  createProtocolConnection,
  ProposedFeatures,
  type PublishDiagnosticsParams,
  StreamMessageReader,
  StreamMessageWriter,
} from 'vscode-languageserver/node.js'
import { registerLanguageServer } from './server.ts'

const delay = () => new Promise((resolve) => setTimeout(resolve, 5))
async function until(check: () => boolean) {
  for (let index = 0; index < 200; index++) {
    if (check()) return
    await delay()
  }
  expect(check()).toBe(true)
}
async function harness() {
  const directory = await realpath(
    await mkdtemp(join(tmpdir(), 'toned-lsp-workspace-')),
  )
  const incoming = new PassThrough(),
    outgoing = new PassThrough()
  const server = createConnection(
    ProposedFeatures.all,
    new StreamMessageReader(incoming),
    new StreamMessageWriter(outgoing),
  )
  const registration = registerLanguageServer(server)
  const client = createProtocolConnection(
    new StreamMessageReader(outgoing),
    new StreamMessageWriter(incoming),
  )
  const diagnostics: PublishDiagnosticsParams[] = []
  client.onNotification(
    'textDocument/publishDiagnostics',
    (params: PublishDiagnosticsParams) => diagnostics.push(params),
  )
  server.listen()
  client.listen()
  const uri = (path = '') => pathToFileURL(join(directory, path)).href
  const write = async (path: string, text: string) => {
    await mkdir(join(directory, path, '..'), { recursive: true })
    await writeFile(join(directory, path), text)
  }
  return {
    registration,
    client,
    diagnostics,
    uri,
    write,
    async dispose() {
      registration.dispose()
      client.dispose()
      server.dispose()
      incoming.destroy()
      outgoing.destroy()
      await rm(directory, { recursive: true, force: true })
    },
  }
}
const system = `import * as tokens from './vocabulary';const system=defineSystem({...tokens});export const stylesheet=system.stylesheet`
const sheet = `import * as ui from '@lib/ui';const styles=ui.stylesheet({Root:{color:'accent'}})`
const vocabulary = (value: string) =>
  `export const color=defineToken({values:['${value}']})`

describe('workspace initialization protocol', () => {
  it('returns InvalidParams for malformed include and module mappings', async () => {
    for (const toned of [
      { include: ['../escape'] },
      { include: [] },
      { modules: [] },
      { modules: { '@bad': ['../escape'] } },
      { modules: { '@bad': [] } },
    ]) {
      const h = await harness()
      try {
        await expect(
          h.client.sendRequest('initialize', {
            processId: null,
            rootUri: 'modules' in toned ? null : h.uri(),
            capabilities: {},
            initializationOptions: { toned },
          }),
        ).rejects.toMatchObject({ code: -32602 })
      } finally {
        await h.dispose()
      }
    }
  })
  it('refreshes diagnostics after initial dependency indexing, disk edits/deletion and imported open-buffer edits', async () => {
    const h = await harness(),
      uri = h.uri('src/component.ts'),
      tokenUri = h.uri('tokens/vocabulary.ts')
    try {
      await h.write('src/component.ts', sheet)
      await h.write('tokens/system.ts', system)
      await h.write('tokens/vocabulary.ts', vocabulary('other'))
      await h.write(
        'excluded/hidden.ts',
        `const excluded=defineToken({values:['excluded']})`,
      )
      await h.write(
        'tokens/node_modules/hidden.ts',
        `const excluded=defineToken({values:['excluded']})`,
      )
      await h.client.sendRequest('initialize', {
        processId: null,
        rootUri: h.uri(),
        capabilities: {},
        initializationOptions: {
          toned: {
            include: ['./src/.', './tokens'],
            modules: { '@lib/ui': ['tokens/system.ts'] },
          },
        },
      })
      // Open before initialized: first diagnostics cannot yet see the imported domain.
      await h.client.sendNotification('textDocument/didOpen', {
        textDocument: {
          uri,
          languageId: 'typescript',
          version: 7,
          text: sheet,
        },
      })
      await h.client.sendRequest('toned/inspect', { uri })
      await until(() => h.diagnostics.some((entry) => entry.uri === uri))
      expect(
        h.diagnostics.filter((entry) => entry.uri === uri).at(-1)?.diagnostics,
      ).toEqual([])
      await h.client.sendNotification('initialized', {})
      const last = () =>
        h.diagnostics.filter((entry) => entry.uri === uri).at(-1)
      await until(() =>
        Boolean(
          last()?.diagnostics.some(
            (diagnostic) => diagnostic.code === 'token-value',
          ),
        ),
      )
      expect(last()?.version).toBe(7)
      expect(
        h.registration.service.project.get(h.uri('excluded/hidden.ts')),
      ).toBeUndefined()
      expect(
        h.registration.service.project.get(
          h.uri('tokens/node_modules/hidden.ts'),
        ),
      ).toBeUndefined()
      const indexed = h.registration.service.project.statistics
      for (const path of [
        'excluded/hidden.ts',
        'tokens/node_modules/hidden.ts',
        'tokens/file.test.ts',
        '../outside.ts',
      ]) {
        const ignored = h.uri(path)
        await h.client.sendNotification('textDocument/didOpen', {
          textDocument: {
            uri: ignored,
            languageId: 'typescript',
            version: 1,
            text: sheet,
          },
        })
        await h.client.sendNotification('textDocument/didChange', {
          textDocument: { uri: ignored, version: 2 },
          contentChanges: [{ text: sheet + ' ' }],
        })
        expect(
          await h.client.sendRequest('toned/inspect', { uri: ignored }),
        ).toMatchObject({ total: 0 })
        expect(h.registration.documents.has(ignored)).toBe(false)
      }
      expect(h.registration.service.project.statistics).toEqual(indexed)
      const position = { line: 0, character: sheet.indexOf("'accent'") + 2 }
      expect(
        await h.client.sendRequest('textDocument/completion', {
          textDocument: { uri },
          position,
        }),
      ).toMatchObject({ items: [{ label: 'other' }] })
      expect(
        await h.client.sendRequest('textDocument/definition', {
          textDocument: { uri },
          position: { line: 0, character: sheet.indexOf('color:') },
        }),
      ).toMatchObject([{ uri: tokenUri }])
      await h.write('tokens/vocabulary.ts', vocabulary('accent'))
      await h.client.sendNotification('workspace/didChangeWatchedFiles', {
        changes: [
          { uri: tokenUri, type: 2 },
          { uri: h.uri('excluded/hidden.ts'), type: 2 },
        ],
      })
      await until(() => last()?.diagnostics.length === 0)
      expect(
        h.registration.service.project.get(h.uri('excluded/hidden.ts')),
      ).toBeUndefined()
      // An unsaved imported token module must win over subsequent disk events.
      await h.client.sendNotification('textDocument/didOpen', {
        textDocument: {
          uri: tokenUri,
          languageId: 'typescript',
          version: 3,
          text: vocabulary('unsaved'),
        },
      })
      await h.client.sendRequest('toned/inspect', { uri: tokenUri })
      await until(() =>
        Boolean(
          last()?.diagnostics.some(
            (diagnostic) => diagnostic.code === 'token-value',
          ),
        ),
      )
      await h.client.sendNotification('workspace/didChangeWatchedFiles', {
        changes: [{ uri: tokenUri, type: 2 }],
      })
      await h.client.sendRequest('toned/inspect', { uri: tokenUri })
      expect(h.registration.service.project.get(tokenUri)?.text).toContain(
        'unsaved',
      )
      await h.client.sendNotification('textDocument/didChange', {
        textDocument: { uri: tokenUri, version: 4 },
        contentChanges: [{ text: vocabulary('accent') }],
      })
      await until(() => last()?.diagnostics.length === 0)
      await h.client.sendNotification('textDocument/didClose', {
        textDocument: { uri: tokenUri },
      })
      await until(
        () =>
          h.registration.service.project.get(tokenUri)?.text ===
          vocabulary('accent'),
      )
      await h.write('tokens/vocabulary.ts', vocabulary('other'))
      await h.client.sendNotification('workspace/didChangeWatchedFiles', {
        changes: [{ uri: tokenUri, type: 2 }],
      })
      await until(() =>
        Boolean(
          last()?.diagnostics.some(
            (diagnostic) => diagnostic.code === 'token-value',
          ),
        ),
      )
      await rm(fileURLToPath(tokenUri))
      await h.client.sendNotification('workspace/didChangeWatchedFiles', {
        changes: [{ uri: tokenUri, type: 3 }],
      })
      await until(() => last()?.diagnostics.length === 0)
      expect(h.registration.service.project.get(uri)?.version).toBe(7)
    } finally {
      await h.dispose()
    }
  })
})
