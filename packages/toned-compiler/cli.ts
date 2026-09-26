#!/usr/bin/env node
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { proposeValueEdit } from './edits.ts'
import { DesignProject } from './project.ts'
import { parseEditRequest, parseQuery } from './requests.ts'
import { loadWorkspace } from './workspace.ts'

const args = process.argv.slice(2),
  command = args[0] ?? 'help'
if (command === 'help' || command === '--help') {
  process.stdout.write(
    'toned inspect <directory> [kind] [name] [--offset=N] [--limit=N]\ntoned propose <directory> <JSON scoped edit request>\n\nInspect returns a bounded page of source declarations. Propose returns a revision-bound source patch without writing files. Start the editor server with toned-lsp --stdio.\n',
  )
} else {
  const directory = args[1]
  if (!directory || !['inspect', 'propose'].includes(command))
    throw new Error('Expected toned inspect|propose <directory>; use --help')
  const project = new DesignProject()
  try {
    const indexed = await loadWorkspace(
      project,
      pathToFileURL(resolve(directory)).href,
    )
    if (indexed.errors.length) {
      process.stderr.write(
        `${JSON.stringify({ incomplete: indexed.errors })}\n`,
      )
      process.exitCode = 1
    }
    if (command === 'inspect') {
      const positional = args.slice(2).filter((arg) => !arg.startsWith('--'))
      const flags = Object.fromEntries(
        args
          .slice(2)
          .filter((arg) => arg.startsWith('--'))
          .map((arg) => {
            const match = /^--(offset|limit)=(\d+)$/.exec(arg)
            if (!match) throw new Error('Expected --offset=N or --limit=N')
            return [match[1], Number(match[2])]
          }),
      )
      process.stdout.write(
        `${JSON.stringify(project.query(parseQuery({ kind: positional[0], name: positional[1], ...flags })), null, 2)}\n`,
      )
    } else {
      if (!args[2] || args[2].length > 100_000)
        throw new Error('Expected one bounded JSON edit request')
      const request = parseEditRequest(JSON.parse(args[2]))
      process.stdout.write(
        `${JSON.stringify(proposeValueEdit(project, request), null, 2)}\n`,
      )
    }
  } finally {
    project.dispose()
  }
}
