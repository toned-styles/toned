import * as vscode from 'vscode'
import {
  CloseAction,
  ErrorAction,
  LanguageClient,
} from 'vscode-languageclient/node'
import { OwnedServer } from './owned-server.ts'

type Session = {
  client: LanguageClient
  ready: Promise<void>
  server: OwnedServer
}
const sessions = new Map<string, Session>()
let output: vscode.OutputChannel
let stopping = false
let context: vscode.ExtensionContext
let lifecycle = Promise.resolve()
const languages = new Set([
  'typescript',
  'typescriptreact',
  'javascript',
  'javascriptreact',
])

function folderFor(document?: vscode.TextDocument) {
  return document?.uri.scheme === 'file'
    ? vscode.workspace.getWorkspaceFolder(document.uri)
    : undefined
}
async function stopAll() {
  const results = await Promise.allSettled(
    [...sessions].map(async ([key, session]) => {
      await session.server.stop()
      if (sessions.get(key) === session) sessions.delete(key)
    }),
  )
  const failures = results.filter((result) => result.status === 'rejected')
  if (failures.length)
    throw new AggregateError(
      failures.map((result) => result.reason),
      'Toned could not stop every server',
    )
}

function start(document: vscode.TextDocument): Session | undefined {
  const folder = folderFor(document)
  if (
    stopping ||
    !folder ||
    !vscode.workspace.isTrusted ||
    !languages.has(document.languageId)
  )
    return
  const key = folder.uri.toString(),
    existing = sessions.get(key)
  if (existing) return existing
  const settings = vscode.workspace.getConfiguration('toned', folder.uri)
  if (!settings.get<boolean>('enabled', true)) return
  if (sessions.size >= 4) {
    output.appendLine(
      'Toned supports four active workspace folders; close an unused folder to index another.',
    )
    return
  }
  const server = new OwnedServer(
    context.asAbsolutePath('dist/server.cjs'),
    10_000,
    (message) => output.appendLine(message),
  )
  const client = new LanguageClient('toned', 'Toned', server.spawn, {
    workspaceFolder: folder,
    documentSelector: [...languages].map((language) => ({
      scheme: 'file',
      language,
      pattern: `${folder.uri.fsPath.replace(/\\/g, '/').replace(/[?*{}[\]]/g, (character) => `[${character}]`)}/**/*`,
    })),
    initializationOptions: {
      toned: {
        include: settings.get('include', ['.']),
        modules: settings.get('modules', {}),
      },
    },
    outputChannel: output,
    errorHandler: {
      error: () => ({ action: ErrorAction.Continue }),
      closed: () => ({ action: CloseAction.DoNotRestart }),
    },
  })
  const session: Session = { client, ready: Promise.resolve(), server }
  sessions.set(key, session)
  session.ready = server
    .initialize(
      () => client.start(),
      () => client.dispose(),
    )
    .catch((error) => {
      if (sessions.get(key) === session) sessions.delete(key)
      throw error
    })
  void session.ready.catch((error) =>
    output.appendLine(`Toned startup failed: ${String(error)}`),
  )
  return session
}
async function activeSession() {
  await lifecycle
  const document = vscode.window.activeTextEditor?.document
  const session = document && start(document)
  if (!session)
    throw new Error(
      'Open a TypeScript or JavaScript file in a trusted, enabled Toned workspace.',
    )
  await session.ready
  return session.client
}
function restart() {
  lifecycle = lifecycle
    .then(async () => {
      await stopAll()
      if (!stopping)
        for (const document of vscode.workspace.textDocuments) start(document)
    })
    .catch((error) =>
      output.appendLine(`Toned restart failed: ${String(error)}`),
    )
  return lifecycle
}
export async function activate(extension: vscode.ExtensionContext) {
  context = extension
  stopping = false
  output = vscode.window.createOutputChannel('Toned')
  context.subscriptions.push(
    output,
    vscode.workspace.onDidOpenTextDocument((document) => {
      void lifecycle
        .then(() => start(document))
        .catch((error) =>
          output.appendLine(`Toned startup failed: ${String(error)}`),
        )
    }),
    vscode.workspace.onDidChangeWorkspaceFolders(() => {
      void restart()
    }),
    vscode.workspace.onDidChangeConfiguration((event) => {
      if (event.affectsConfiguration('toned')) void restart()
    }),
    vscode.commands.registerCommand('toned.restart', restart),
    vscode.commands.registerCommand('toned.indexStatus', async () => {
      const result = await (await activeSession()).sendRequest(
        'toned/statistics',
      )
      output.appendLine(JSON.stringify(result, null, 2))
      output.show(true)
      return result
    }),
    vscode.commands.registerCommand('toned.inspectSelection', async () => {
      const editor = vscode.window.activeTextEditor
      if (!editor)
        throw new Error('Open a source file to inspect its Toned declaration.')
      const result = await (await activeSession()).sendRequest(
        'textDocument/hover',
        {
          textDocument: { uri: editor.document.uri.toString() },
          position: editor.selection.active,
        },
      )
      output.appendLine(JSON.stringify(result, null, 2))
      output.show(true)
      return result
    }),
  )
  for (const document of vscode.workspace.textDocuments) start(document)
}
export async function deactivate() {
  stopping = true
  await lifecycle
  await stopAll()
}
