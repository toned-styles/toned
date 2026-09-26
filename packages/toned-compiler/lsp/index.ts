import type { Readable, Writable } from 'node:stream'
import {
  createConnection,
  ProposedFeatures,
  StreamMessageReader,
  StreamMessageWriter,
} from 'vscode-languageserver/node.js'
import { registerLanguageServer } from './server.ts'

/** Embed the standard LSP over owned streams. The CLI supplies process stdio.
 * Protocol-library implementation types are deliberately not public API. */
export function startLanguageServer(options: {
  readonly input: Readable
  readonly output: Writable
}): { dispose(): void } {
  const connection = createConnection(
    ProposedFeatures.all,
    new StreamMessageReader(options.input),
    new StreamMessageWriter(options.output),
  )
  const server = registerLanguageServer(connection)
  connection.listen()
  let disposed = false
  return {
    dispose() {
      if (disposed) return
      disposed = true
      server.dispose()
      connection.dispose()
    },
  }
}
