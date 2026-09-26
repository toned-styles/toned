import type { Connection } from 'vscode-languageserver/node.js'
import {
  DidChangeWatchedFilesNotification,
  ErrorCodes,
  ResponseError,
  TextDocumentSyncKind,
} from 'vscode-languageserver/node.js'
import { TextDocument } from 'vscode-languageserver-textdocument'
import { parseEditRequest, parseQuery } from '../requests.ts'
import {
  includesWorkspaceFile,
  loadWorkspace,
  readWorkspaceFile,
} from '../workspace.ts'
import { DesignLanguageService } from './service.ts'

/** Register on an explicit connection, allowing real protocol tests without global stdio. */
export function registerLanguageServer(
  connection: Connection,
  service = new DesignLanguageService(),
) {
  const documents = new Map<string, TextDocument>()
  let openCharacters = 0
  const removeOpen = (uri: string) => {
    openCharacters -= documents.get(uri)?.getText().length ?? 0
    documents.delete(uri)
  }
  const indexing = new AbortController()
  const pending = new Map<string, TextDocument>()
  let scheduled = false,
    roots: string[] = [],
    disposed = false,
    dynamicWatch = false
  const indexingStatus = new Map<
    string,
    {
      state: 'loading' | 'complete' | 'incomplete'
      loaded?: number
      errors?: readonly { uri: string; message: string }[]
    }
  >()
  const rootFor = (uri: string) =>
    roots.find((root) => uri.startsWith(root.replace(/\/$/, '') + '/'))
  const flush = () => {
    scheduled = false
    for (const [uri, document] of pending) {
      pending.delete(uri)
      try {
        service.project.update(uri, document.getText(), document.version)
        connection.sendDiagnostics({
          uri,
          version: document.version,
          diagnostics: [...service.diagnostics(uri)],
        })
      } catch (error) {
        // Keep the editor snapshot so the next change can repair a parse-budget failure.
        service.forget(uri)
        connection.sendDiagnostics({
          uri,
          version: document.version,
          diagnostics: [
            {
              range: {
                start: { line: 0, character: 0 },
                end: { line: 0, character: 0 },
              },
              severity: 1,
              source: 'toned',
              message: String(error),
            },
          ],
        })
      }
    }
  }
  const current = <T>(query: () => T): T => {
    if (pending.size) flush()
    return query()
  }
  connection.onInitialize((params) => {
    roots = [
      ...new Set(
        params.workspaceFolders?.map((folder) => folder.uri) ??
          (params.rootUri ? [params.rootUri] : []),
      ),
    ]
    if (roots.length > 16 || roots.some((root) => !root.startsWith('file:')))
      throw new ResponseError(
        ErrorCodes.InvalidParams,
        'Toned supports up to 16 file workspace roots',
      )
    roots.sort((a, b) => b.length - a.length)
    for (const root of roots) indexingStatus.set(root, { state: 'loading' })
    dynamicWatch =
      params.capabilities.workspace?.didChangeWatchedFiles
        ?.dynamicRegistration === true
    return {
      capabilities: {
        textDocumentSync: TextDocumentSyncKind.Full,
        completionProvider: { triggerCharacters: [':', "'", '"', '.'] },
        hoverProvider: true,
        definitionProvider: true,
        referencesProvider: true,
        documentSymbolProvider: true,
        codeActionProvider: true,
        executeCommandProvider: { commands: ['toned.setValue'] },
      },
      serverInfo: { name: 'toned', version: '0.1.0' },
    }
  })
  connection.onInitialized(async () => {
    if (dynamicWatch && roots.length) {
      try {
        await connection.client.register(
          DidChangeWatchedFilesNotification.type,
          {
            watchers: roots.map((root) => ({
              globPattern: { baseUri: root, pattern: '**/*.{ts,tsx,js,jsx}' },
              kind: 7,
            })),
          },
        )
      } catch (error) {
        if (!disposed)
          connection.console.warn(
            `Toned file watching unavailable: ${String(error)}`,
          )
      }
    }
    for (const root of roots) {
      if (disposed) break
      indexingStatus.set(root, { state: 'loading' })
      try {
        const result = await loadWorkspace(service.project, root, {
          signal: indexing.signal,
          isOpen: (uri) => Boolean(documents.get(uri)),
        })
        if (disposed) break
        indexingStatus.set(root, {
          state: result.errors.length ? 'incomplete' : 'complete',
          loaded: result.loaded,
          errors: result.errors,
        })
        if (result.errors.length)
          connection.console.warn(
            `Toned index incomplete: ${JSON.stringify(result.errors.slice(0, 20))}`,
          )
      } catch (error) {
        if (!disposed) {
          indexingStatus.set(root, {
            state: 'incomplete',
            errors: [{ uri: root, message: String(error) }],
          })
          connection.console.error(String(error))
        }
      }
    }
  })
  const rejectDocument = (uri: string, version: number, cause: unknown) => {
    // Full synchronization lets us retain only a bounded open marker for rejected
    // buffers. The next snapshot can recover without close/reopen, and disk
    // notifications can never replace an unsaved, over-budget editor document.
    const previous = documents.get(uri)
    if (uri.length <= 8192 && (previous || documents.size < 4096)) {
      removeOpen(uri)
      documents.set(
        uri,
        TextDocument.create(
          uri,
          previous?.languageId ?? 'typescriptreact',
          version,
          '',
        ),
      )
    }
    pending.delete(uri)
    service.forget(uri)
    connection.sendDiagnostics({
      uri,
      version,
      diagnostics: [
        {
          range: {
            start: { line: 0, character: 0 },
            end: { line: 0, character: 0 },
          },
          severity: 1,
          source: 'toned',
          message: String(cause),
        },
      ],
    })
  }
  const queueDocument = (document: TextDocument) => {
    const previous = documents.get(document.uri)
    const size = document.getText().length
    if (
      document.uri.length > 8192 ||
      size > 1_000_000 ||
      (!previous && documents.size >= 4096) ||
      openCharacters - (previous?.getText().length ?? 0) + size > 32_000_000
    )
      throw new Error(
        'Toned open-document budget exceeded; narrow the workspace or close documents',
      )
    if (!Number.isSafeInteger(document.version) || document.version < 0)
      throw new Error('Invalid document version')
    removeOpen(document.uri)
    documents.set(document.uri, document)
    openCharacters += size
    pending.set(document.uri, document)
    if (!scheduled) {
      scheduled = true
      setImmediate(() => {
        if (!disposed) flush()
      })
    }
  }
  connection.onDidOpenTextDocument(({ textDocument }) => {
    if (disposed) return
    try {
      // LSP document versions restart when a file is reopened; disk versions are separate.
      service.forget(textDocument.uri)
      queueDocument(
        TextDocument.create(
          textDocument.uri,
          textDocument.languageId,
          textDocument.version,
          textDocument.text,
        ),
      )
    } catch (cause) {
      rejectDocument(textDocument.uri, textDocument.version, cause)
    }
  })
  connection.onDidChangeTextDocument(({ textDocument, contentChanges }) => {
    if (disposed) return
    const previous = documents.get(textDocument.uri)
    if (!previous) return
    if (textDocument.version <= previous.version) return
    try {
      if (contentChanges.length !== 1 || 'range' in contentChanges[0]!)
        throw new Error('Toned requires a full document snapshot per change')
      queueDocument(
        TextDocument.create(
          previous.uri,
          previous.languageId,
          textDocument.version,
          contentChanges[0]!.text,
        ),
      )
    } catch (cause) {
      rejectDocument(textDocument.uri, textDocument.version, cause)
    }
  })
  connection.onDidCloseTextDocument(({ textDocument }) => {
    if (disposed) return
    removeOpen(textDocument.uri)
    pending.delete(textDocument.uri)
    service.forget(textDocument.uri)
    connection.sendDiagnostics({ uri: textDocument.uri, diagnostics: [] })
    enqueueDiskChange(textDocument.uri, 2)
  })
  connection.onCompletion((params) =>
    current(() => {
      const result = service.completions(
        params.textDocument.uri,
        params.position,
      )
      const root = rootFor(params.textDocument.uri)
      return {
        ...result,
        isIncomplete:
          result.isIncomplete ||
          Boolean(root && indexingStatus.get(root)?.state !== 'complete'),
      }
    }),
  )
  connection.onHover((params) =>
    current(() => service.hover(params.textDocument.uri, params.position)),
  )
  connection.onDefinition((params) =>
    current(() => [
      ...service.definition(params.textDocument.uri, params.position),
    ]),
  )
  connection.onReferences((params) =>
    current(() => [
      ...service.references(params.textDocument.uri, params.position),
    ]),
  )
  connection.onDocumentSymbol((params) =>
    current(() => [...service.symbols(params.textDocument.uri)]),
  )
  connection.onCodeAction((params) =>
    current(() => {
      const document = service.document(params.textDocument.uri),
        node =
          document &&
          service.project.at(
            document.uri,
            document.offsetAt(params.range.start),
          )
      if (!node || node.opaque || !node.valueSpan) return []
      const completions = service.completions(
        node.uri,
        document!.positionAt(node.valueSpan.start),
      )
      return completions.items.flatMap((item) => {
        if (!item.textEdit || !('range' in item.textEdit)) return []
        return [
          {
            title: `Toned: set ${node.name} to ${item.label}`,
            kind: 'quickfix',
            edit: {
              documentChanges: [
                {
                  textDocument: {
                    uri: node.uri,
                    version: documents.get(node.uri)?.version ?? null,
                  },
                  edits: [item.textEdit],
                },
              ],
            },
          },
        ]
      })
    }),
  )
  const validated = <T>(query: () => T): T => {
    try {
      return current(query)
    } catch (error) {
      throw new ResponseError(ErrorCodes.InvalidParams, String(error))
    }
  }
  connection.onRequest('toned/inspect', (params) =>
    validated(() => service.project.query(parseQuery(params))),
  )
  connection.onRequest('toned/statistics', () => ({
    ...service.project.statistics,
    workspaces: Object.fromEntries(indexingStatus),
  }))
  connection.onRequest('toned/proposeEdit', (params) =>
    validated(() =>
      service.propose(
        parseEditRequest(params),
        (uri) => documents.get(uri)?.version ?? null,
      ),
    ),
  )
  connection.onExecuteCommand(async (params) => {
    if (params.command !== 'toned.setValue' || params.arguments?.length !== 1)
      throw new ResponseError(
        ErrorCodes.InvalidParams,
        'Expected toned.setValue with one scoped edit request',
      )
    const proposal = validated(() =>
      service.propose(
        parseEditRequest(params.arguments![0]),
        (uri) => documents.get(uri)?.version ?? null,
      ),
    )
    return connection.workspace.applyEdit(proposal.workspaceEdit)
  })
  const diskChanges = new Map<string, number>()
  let readingDisk = false
  const incompleteWatch = (message: string) => {
    connection.console.warn(message)
    for (const root of roots)
      indexingStatus.set(root, {
        state: 'incomplete',
        errors: [{ uri: root, message }],
      })
  }
  const drainDiskChanges = async () => {
    if (readingDisk) return
    readingDisk = true
    try {
      for (const [uri, type] of diskChanges) {
        diskChanges.delete(uri)
        const root = rootFor(uri)
        if (!root || documents.has(uri) || disposed) continue
        if (type === 3) {
          service.forget(uri)
          continue
        }
        const previous = service.project.get(uri)
        try {
          const text = await readWorkspaceFile(root, uri)
          // Newer notifications and editor snapshots invalidate older I/O.
          if (
            !disposed &&
            !documents.has(uri) &&
            !diskChanges.has(uri) &&
            service.project.get(uri) === previous
          )
            service.project.update(uri, text, (previous?.version ?? -1) + 1)
        } catch (error) {
          if (
            !disposed &&
            !documents.has(uri) &&
            !diskChanges.has(uri) &&
            service.project.get(uri) === previous
          ) {
            service.forget(uri)
            incompleteWatch(`Toned could not refresh ${uri}: ${String(error)}`)
          }
        }
      }
    } finally {
      readingDisk = false
    }
  }
  function enqueueDiskChange(uri: string, type: number) {
    const root = rootFor(uri)
    if (
      disposed ||
      documents.has(uri) ||
      !root ||
      !includesWorkspaceFile(root, uri)
    )
      return
    if (
      uri.length > 8192 ||
      (!diskChanges.has(uri) && diskChanges.size >= 4096)
    ) {
      incompleteWatch(
        'Toned watcher queue exceeds budget; restart the workspace index',
      )
      return
    }
    diskChanges.set(uri, type)
    void drainDiskChanges()
  }
  connection.onDidChangeWatchedFiles((params) => {
    if (disposed) return
    for (const change of params.changes.slice(0, 4096))
      enqueueDiskChange(change.uri, change.type)
    if (params.changes.length > 4096)
      incompleteWatch(
        'Toned watcher batch exceeds budget; restart the workspace index',
      )
  })
  connection.onShutdown(() => {
    disposed = true
    indexing.abort()
    pending.clear()
    diskChanges.clear()
    documents.clear()
    openCharacters = 0
    service.dispose()
  })
  return {
    service,
    documents,
    dispose: () => {
      disposed = true
      indexing.abort()
      pending.clear()
      diskChanges.clear()
      documents.clear()
      openCharacters = 0
      service.dispose()
    },
  }
}
