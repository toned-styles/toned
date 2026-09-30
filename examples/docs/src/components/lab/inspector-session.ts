import {
  applyDesignEdit,
  DesignProject,
  proposeValueEdit,
} from '@toned/compiler'
import {
  type InspectorTransport,
  mountDesignInspector,
} from '@toned/compiler/inspector'

const uri = 'file:///toned-lab/button.ts'
const initial = `import { defineSystem, defineToken } from '@toned/core'
const ui = defineSystem({ id: 'inspector-demo', tokens: {
  padding: defineToken({ values: [8, 16, 24], resolve: value => ({ padding: value }) }),
} })
// Edits preserve surrounding source and validate the current revision.
export const buttonStyles = ui.stylesheet({ Root: { padding: 16 } })
`
export function mountInspectorSession(
  container: HTMLElement,
  onSource: (source: string) => void,
) {
  const project = new DesignProject({
    maxFiles: 1,
    maxCharacters: 8000,
    maxDocumentCharacters: 8000,
    maxNodesPerDocument: 100,
  })
  project.update(uri, initial, 1)
  onSource(initial)
  function current(target: string) {
    if (target !== uri)
      throw new Error('Only the example document is available')
    const document = project.get(target)
    if (!document) throw new Error('Example document is unavailable')
    return document
  }
  const transport: InspectorTransport = {
    query: async (input, signal) => {
      signal.throwIfAborted()
      return project.query({ ...input, uri, limit: Math.min(input.limit, 50) })
    },
    document: async (target, signal) => {
      signal.throwIfAborted()
      return current(target)
    },
    propose: async (input, signal) => {
      signal.throwIfAborted()
      return proposeValueEdit(project, input)
    },
    apply: async (change, signal) => {
      signal.throwIfAborted()
      const document = current(change.edit.uri)
      const next = applyDesignEdit(document.text, document.version, change.edit)
      if (next.length > 8000)
        throw new Error('Example source exceeds its limit')
      const updated = project.update(uri, next, document.version + 1)
      onSource(next)
      return updated
    },
  }
  const inspector = mountDesignInspector(container, {
    transport,
    selection: { uri, owner: 'buttonStyles', part: 'Root' },
    pageSize: 25,
  })
  return () => inspector.dispose()
}
