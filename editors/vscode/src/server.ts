import { startLanguageServer } from '@toned/compiler/lsp'

const server = startLanguageServer({
  input: process.stdin,
  output: process.stdout,
})
process.once('SIGTERM', () => {
  server.dispose()
  process.exit(0)
})
