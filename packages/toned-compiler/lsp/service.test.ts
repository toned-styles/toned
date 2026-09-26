import { PassThrough } from 'node:stream'
import { describe, expect, it } from 'vitest'
import {
  createConnection,
  createProtocolConnection,
  ProposedFeatures,
  StreamMessageReader,
  StreamMessageWriter,
} from 'vscode-languageserver/node.js'
import { registerLanguageServer } from './server.ts'
import { DesignLanguageService } from './service.ts'

const uri = 'file:///workspace/control.tsx'
const source = `const ui=defineSystem({id:'ui',tokens:{gap:defineToken({values:[0,2,4],resolve:gap=>({gap})})}})
export const styles=ui.stylesheet({Root:{gap:2}})`

describe('design language service', () => {
  it('provides token completion, source definition, hover and versioned edits from one cached index', () => {
    const service = new DesignLanguageService()
    service.project.update(uri, source, 1)
    const document = service.document(uri)!,
      offset = source.lastIndexOf('gap:2') + 4,
      position = document.positionAt(offset)
    expect(
      service.completions(uri, position).items.map((item) => item.label),
    ).toEqual(['0', '2', '4'])
    expect(service.hover(uri, position)?.contents).toMatchObject({
      value: expect.stringContaining('styles / Root / gap'),
    })
    expect(
      service.definition(uri, document.positionAt(offset - 2)),
    ).toHaveLength(1)
    const node = service.project.at(uri, offset)!
    const proposal = service.propose({
      nodeId: node.id,
      value: 4,
      expectedVersion: 1,
      scope: { uri, owner: 'styles' },
    })
    expect(proposal.workspaceEdit.documentChanges?.[0]).toMatchObject({
      textDocument: { uri, version: 1 },
      edits: [{ newText: '4' }],
    })
    for (let n = 0; n < 100; n++) service.completions(uri, position)
    expect(service.project.statistics.parses).toBe(1)
    service.dispose()
  })
  it('resolves references from an imported stylesheet use outside a declaration', () => {
    const service = new DesignLanguageService()
    service.project.update(uri, source, 1)
    const consumerUri = 'file:///workspace/consumer.ts'
    const consumer =
      "import { styles as button } from './control'; export const reference = button"
    service.project.update(consumerUri, consumer, 1)
    const position = service
      .document(consumerUri)!
      .positionAt(consumer.lastIndexOf('button'))
    expect(
      service
        .definition(consumerUri, position)
        .some((target) => target.uri === uri),
    ).toBe(true)
    expect(
      service
        .references(consumerUri, position)
        .some((target) => target.uri === consumerUri),
    ).toBe(true)
    service.dispose()
  })
  it('serves actual JSON-RPC lifecycle, incremental edits and custom inspection requests', async () => {
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
    server.listen()
    client.listen()
    try {
      const initialized = (await client.sendRequest('initialize', {
        processId: null,
        rootUri: null,
        capabilities: {},
      })) as { capabilities: { textDocumentSync: number } }
      expect(initialized.capabilities.textDocumentSync).toBe(2)
      await client.sendNotification('initialized', {})
      await client.sendNotification('textDocument/didOpen', {
        textDocument: {
          uri,
          languageId: 'typescriptreact',
          version: 1,
          text: source,
        },
      })
      const position = {
        line: 1,
        character: source.split('\n')[1]!.indexOf('gap:2') + 4,
      }
      const completions = (await client.sendRequest('textDocument/completion', {
        textDocument: { uri },
        position,
      })) as { items: { label: string }[] }
      expect(completions.items.map((item) => item.label)).toEqual([
        '0',
        '2',
        '4',
      ])
      await client.sendNotification('textDocument/didChange', {
        textDocument: { uri, version: 2 },
        contentChanges: [
          {
            range: {
              start: position,
              end: { ...position, character: position.character + 1 },
            },
            text: '4',
          },
        ],
      })
      const page = (await client.sendRequest('toned/inspect', {
        uri,
        owner: 'styles',
      })) as { items: { value?: number }[] }
      expect(page.items.some((item) => item.value === 4)).toBe(true)
      const stats = (await client.sendRequest('toned/statistics')) as {
        parses: number
      }
      expect(stats.parses).toBe(2)
      await expect(
        client.sendRequest('toned/inspect', { limit: 900 }),
      ).rejects.toMatchObject({ code: -32602 })
      await expect(
        client.sendRequest('toned/proposeEdit', { value: 2 }),
      ).rejects.toMatchObject({ code: -32602 })
      await client.sendNotification('textDocument/didChange', {
        textDocument: { uri, version: 3 },
        contentChanges: [{ text: ' '.repeat(1_000_001) }],
      })
      const refused = (await client.sendRequest('toned/inspect', { uri })) as {
        total: number
      }
      expect(refused.total).toBe(0)
      expect(registration.documents.size).toBe(0)
      await client.sendNotification('textDocument/didOpen', {
        textDocument: {
          uri,
          languageId: 'typescriptreact',
          version: 4,
          text: source,
        },
      })
      expect(await client.sendRequest('toned/inspect', { uri })).toMatchObject({
        total: expect.any(Number),
      })
      await client.sendNotification('textDocument/didClose', {
        textDocument: { uri },
      })
      expect(await client.sendRequest('toned/inspect', { uri })).toMatchObject({
        total: 0,
      })
      await client.sendRequest('shutdown')
      expect(registration.documents.size).toBe(0)
    } finally {
      registration.dispose()
      client.dispose()
      server.dispose()
      incoming.destroy()
      outgoing.destroy()
    }
  })
})
