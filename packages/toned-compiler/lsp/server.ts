import type { Connection } from 'vscode-languageserver/node.js'
import {
  DidChangeWatchedFilesNotification,
  ErrorCodes,
  LSPErrorCodes,
  ResponseError,
  TextDocumentSyncKind,
} from 'vscode-languageserver/node.js'
import { TextDocument } from 'vscode-languageserver-textdocument'
import { DesignProject } from '../project.ts'
import { parseEditRequest, parseQuery } from '../requests.ts'
import {
  includesWorkspaceFile,
  loadWorkspace,
  readWorkspaceFile,
} from '../workspace.ts'
import { parseWorkspaceOptions, type WorkspaceOptions } from './options.ts'
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
  let workspaceOptions: WorkspaceOptions = {}
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
  // At most one entry per bounded open document. Yield between small batches so
  // a large token vocabulary update does not monopolize the protocol loop.
  const diagnosticQueue = new Set<string>()
  const published = new Map<string, { version: number; content: string }>()
  let diagnosticComputations = 0,
    diagnosticPublications = 0
  const publishDiagnostics = (uri: string, version: number) => {
    diagnosticComputations++
    const diagnostics = [...service.diagnostics(uri)]
    const content = JSON.stringify(diagnostics),
      previous = published.get(uri)
    if (previous?.version === version && previous.content === content) return
    // Only bounded open documents own retained publication state.
    published.set(uri, { version, content })
    diagnosticPublications++
    connection.sendDiagnostics({ uri, version, diagnostics })
  }
  let diagnosticsScheduled = false
  const drainDiagnostics = () => {
    diagnosticsScheduled = false
    if (disposed || pending.size || activeRequests) return
    let remaining = 16
    for (const uri of diagnosticQueue) {
      diagnosticQueue.delete(uri)
      const document = documents.get(uri),
        indexed = service.project.get(uri)
      if (
        document &&
        indexed?.version === document.version &&
        !pending.has(uri)
      )
        publishDiagnostics(uri, document.version)
      if (--remaining === 0) break
    }
    if (diagnosticQueue.size) scheduleDiagnostics()
  }
  function scheduleDiagnostics() {
    if (disposed || diagnosticsScheduled || !diagnosticQueue.size) return
    diagnosticsScheduled = true
    setImmediate(drainDiagnostics)
  }
  function refreshDiagnostics(changedUri?: string) {
    const affected = changedUri
      ? service.project.dependents(changedUri)
      : documents.keys()
    for (const uri of affected) if (documents.has(uri)) diagnosticQueue.add(uri)
    scheduleDiagnostics()
  }
  const processDocument = (uri: string) => {
    const document = pending.get(uri)
    if (!document) return
    pending.delete(uri)
    try {
      service.project.update(uri, document.getText(), document.version)
      refreshDiagnostics(uri)
    } catch (error) {
      // Retain the open snapshot so the next full change can repair a budget failure.
      refreshDiagnostics(uri)
      service.forget(uri)
      published.delete(uri)
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
  const flush = () => {
    scheduled = false
    const deadline = performance.now() + 6
    let count = 0
    for (const uri of pending.keys()) {
      processDocument(uri)
      if (++count >= 8 || performance.now() >= deadline) break
    }
    if (pending.size) scheduleFlush()
    else scheduleDiagnostics()
  }
  function scheduleFlush() {
    if (disposed || scheduled || !pending.size) return
    scheduled = true
    setImmediate(() => {
      if (!disposed) flush()
    })
  }
  const yieldWork = () => new Promise<void>((resolve) => setImmediate(resolve))
  const loadRequestedDependencies = async (uri: string, check: () => void) => {
    const queue = [uri],
      enqueued = new Set(queue)
    const snapshots = new Map<string, ReturnType<typeof service.project.get>>()
    let reads = 0
    // This supplements the normal scan, never executes configuration/modules, and
    // retains the same inclusion, source-size, project-size and open-buffer guards.
    for (let cursor = 0; cursor < queue.length && cursor < 256; cursor++) {
      check()
      const target = queue[cursor]!
      processDocument(target)
      snapshots.set(target, service.project.get(target))
      for (const candidates of service.project.dependencyCandidates(target)) {
        for (const candidate of candidates) {
          if (!snapshots.has(candidate)) {
            if (snapshots.size >= 32_768) return snapshots
            snapshots.set(candidate, service.project.get(candidate))
          }
          const root = rootFor(candidate)
          if (
            !root ||
            !includesWorkspaceFile(root, candidate, workspaceOptions.include)
          )
            continue
          processDocument(candidate)
          if (
            !service.project.get(candidate) &&
            indexingStatus.get(root)?.state === 'loading' &&
            !documents.has(candidate)
          ) {
            if (++reads > 1024 || disposed) return snapshots
            const previous = service.project.get(candidate)
            try {
              const text = await readWorkspaceFile(root, candidate)
              check()
              if (
                !disposed &&
                rootFor(candidate) === root &&
                includesWorkspaceFile(
                  root,
                  candidate,
                  workspaceOptions.include,
                ) &&
                !documents.has(candidate) &&
                service.project.get(candidate) === previous
              ) {
                service.project.update(
                  candidate,
                  text,
                  (previous?.version ?? -1) + 1,
                )
                snapshots.set(candidate, service.project.get(candidate))
                refreshDiagnostics(candidate)
              }
            } catch {
              // Missing candidates are normal; the background scan owns filesystem diagnostics.
              check()
              continue
            }
          }
          if (service.project.get(candidate)) {
            if (!enqueued.has(candidate) && queue.length < 256) {
              enqueued.add(candidate)
              queue.push(candidate)
            }
            break
          }
        }
      }
      if (disposed) return snapshots
      if (cursor % 8 === 7) await yieldWork()
    }
    return snapshots
  }
  // Parse the current request and its transitive imports before unrelated buffers.
  // Revisit after yielding: notifications may have replaced the requested snapshot
  // or introduced new imports while this request was suspended.
  let activeRequests = 0
  const queryCurrent = async <T>(
    query: () => T,
    uri: string | undefined,
    check: () => void,
  ): Promise<T> => {
    if (
      uri &&
      [...indexingStatus.values()].some((status) => status.state === 'loading')
    ) {
      for (let pass = 0; ; pass++) {
        check()
        if (pass >= 64)
          throw new ResponseError(
            LSPErrorCodes.ContentModified,
            'Toned imports kept changing during initial indexing; retry',
          )
        const snapshots = await loadRequestedDependencies(uri, check)
        if (
          ![...snapshots].some(
            ([target, document]) =>
              pending.has(target) || service.project.get(target) !== document,
          )
        )
          break
      }
    }
    check()
    if (!pending.size) return query()
    const deadline = performance.now() + 15_000
    for (let pass = 0; ; pass++) {
      if (pass >= 64 || performance.now() >= deadline)
        throw new ResponseError(
          ErrorCodes.InvalidRequest,
          'Toned documents kept changing during the request; retry the current snapshot',
        )
      check()
      const queue = uri ? [uri] : [...pending.keys()]
      const snapshots = new Map<
        string,
        ReturnType<typeof service.project.get>
      >()
      const seen = new Set<string>(),
        enqueued = new Set(queue)
      let count = 0,
        changed = false
      for (let cursor = 0; cursor < queue.length; cursor++) {
        const target = queue[cursor]!
        if (seen.has(target)) continue
        seen.add(target)
        if (pending.has(target)) {
          processDocument(target)
          changed = true
        }
        snapshots.set(target, service.project.get(target))
        if (uri)
          for (const dependency of service.project.dependencies(target)) {
            if (!snapshots.has(dependency)) {
              if (snapshots.size >= 32_768)
                throw new ResponseError(
                  ErrorCodes.InvalidRequest,
                  'Toned request dependency budget exceeded; narrow the workspace',
                )
              snapshots.set(dependency, service.project.get(dependency))
            }
            if (
              !enqueued.has(dependency) &&
              (pending.has(dependency) || service.project.get(dependency))
            ) {
              enqueued.add(dependency)
              queue.push(dependency)
            }
          }
        if (++count % 8 === 0) await yieldWork()
        check()
      }
      // No await between this validation and query execution.
      if (
        ![...snapshots].some(
          ([target, document]) =>
            pending.has(target) || service.project.get(target) !== document,
        ) &&
        (uri || !pending.size)
      )
        break
      if (!changed) await yieldWork()
    }
    scheduleDiagnostics()
    return query()
  }
  const current = async <T>(
    query: () => T,
    uri?: string,
    cancellation?: { readonly isCancellationRequested: boolean },
  ): Promise<T> => {
    if (activeRequests >= 32)
      throw new ResponseError(
        ErrorCodes.InvalidRequest,
        'Toned interactive request budget exceeded; retry after pending requests finish',
      )
    activeRequests++
    const deadline = performance.now() + 15_000
    const check = () => {
      if (cancellation?.isCancellationRequested)
        throw new ResponseError(
          LSPErrorCodes.RequestCancelled,
          'Toned request cancelled',
        )
      if (disposed || performance.now() >= deadline)
        throw new ResponseError(
          LSPErrorCodes.ServerCancelled,
          'Toned request expired or server disposed; retry the current snapshot',
        )
    }
    try {
      check()
      return await queryCurrent(query, uri, check)
    } finally {
      activeRequests--
      scheduleDiagnostics()
    }
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
    try {
      workspaceOptions = parseWorkspaceOptions(params.initializationOptions)
      if (!roots.length && workspaceOptions.modules) {
        // Initialization without workspace folders still validates the protocol.
        const validation = new DesignProject()
        validation.configureModules('file:///', workspaceOptions.modules)
        validation.dispose()
      }
      for (const root of roots)
        service.project.configureModules(root, workspaceOptions.modules ?? {})
    } catch (cause) {
      throw new ResponseError(ErrorCodes.InvalidParams, String(cause))
    }
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
          include: workspaceOptions.include,
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
      if (!disposed) refreshDiagnostics()
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
    published.delete(uri)
    refreshDiagnostics(uri)
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
    scheduleFlush()
  }
  const acceptsEditorDocument = (uri: string) => {
    if (!roots.length) return true
    const root = rootFor(uri)
    return Boolean(
      root && includesWorkspaceFile(root, uri, workspaceOptions.include),
    )
  }
  connection.onDidOpenTextDocument(({ textDocument }) => {
    if (disposed) return
    if (!acceptsEditorDocument(textDocument.uri)) {
      connection.sendDiagnostics({ uri: textDocument.uri, diagnostics: [] })
      return
    }
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
    if (!acceptsEditorDocument(textDocument.uri)) {
      connection.sendDiagnostics({ uri: textDocument.uri, diagnostics: [] })
      return
    }
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
    diagnosticQueue.delete(textDocument.uri)
    published.delete(textDocument.uri)
    refreshDiagnostics(textDocument.uri)
    service.forget(textDocument.uri)
    connection.sendDiagnostics({ uri: textDocument.uri, diagnostics: [] })
    enqueueDiskChange(textDocument.uri, 2)
  })
  connection.onCompletion((params, cancellation) =>
    current(
      () => {
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
      },
      params.textDocument.uri,
      cancellation,
    ),
  )
  connection.onHover((params, cancellation) =>
    current(
      () => service.hover(params.textDocument.uri, params.position),
      params.textDocument.uri,
      cancellation,
    ),
  )
  connection.onDefinition((params, cancellation) =>
    current(
      () => [...service.definition(params.textDocument.uri, params.position)],
      params.textDocument.uri,
      cancellation,
    ),
  )
  connection.onReferences((params, cancellation) =>
    current(
      () => [...service.references(params.textDocument.uri, params.position)],
      undefined,
      cancellation,
    ),
  )
  connection.onDocumentSymbol((params, cancellation) =>
    current(
      () => [...service.symbols(params.textDocument.uri)],
      params.textDocument.uri,
      cancellation,
    ),
  )
  connection.onCodeAction((params, cancellation) =>
    current(
      () => {
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
      },
      params.textDocument.uri,
      cancellation,
    ),
  )
  const validated = async <T>(
    query: () => T,
    cancellation?: { readonly isCancellationRequested: boolean },
  ): Promise<T> => {
    try {
      return await current(query, undefined, cancellation)
    } catch (error) {
      if (error instanceof ResponseError) throw error
      throw new ResponseError(ErrorCodes.InvalidParams, String(error))
    }
  }
  connection.onRequest('toned/inspect', (params, cancellation) =>
    validated(() => service.project.query(parseQuery(params)), cancellation),
  )
  connection.onRequest('toned/statistics', () => ({
    ...service.project.statistics,
    workspaces: Object.fromEntries(indexingStatus),
    scheduling: {
      pending: pending.size,
      diagnosticComputations,
      diagnosticPublications,
    },
    memory: process.memoryUsage(),
  }))
  connection.onRequest('toned/proposeEdit', (params, cancellation) =>
    validated(
      () =>
        service.propose(
          parseEditRequest(params),
          (uri) => documents.get(uri)?.version ?? null,
        ),
      cancellation,
    ),
  )
  connection.onExecuteCommand(async (params, cancellation) => {
    if (params.command !== 'toned.setValue' || params.arguments?.length !== 1)
      throw new ResponseError(
        ErrorCodes.InvalidParams,
        'Expected toned.setValue with one scoped edit request',
      )
    const proposal = await validated(
      () =>
        service.propose(
          parseEditRequest(params.arguments![0]),
          (uri) => documents.get(uri)?.version ?? null,
        ),
      cancellation,
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
          refreshDiagnostics(uri)
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
          ) {
            service.project.update(uri, text, (previous?.version ?? -1) + 1)
            refreshDiagnostics(uri)
          }
        } catch (error) {
          if (
            !disposed &&
            !documents.has(uri) &&
            !diskChanges.has(uri) &&
            service.project.get(uri) === previous
          ) {
            refreshDiagnostics(uri)
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
      !includesWorkspaceFile(root, uri, workspaceOptions.include)
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
    diagnosticQueue.clear()
    published.clear()
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
      diagnosticQueue.clear()
      published.clear()
      documents.clear()
      openCharacters = 0
      service.dispose()
    },
  }
}
