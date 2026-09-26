#!/usr/bin/env node
import {
  createConnection,
  ProposedFeatures,
} from 'vscode-languageserver/node.js'
import { registerLanguageServer } from './server.ts'

const connection = createConnection(ProposedFeatures.all)
registerLanguageServer(connection)
connection.listen()
