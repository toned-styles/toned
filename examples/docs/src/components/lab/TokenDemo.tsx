import { exportDtcg, importDtcg } from '@toned/compiler/tokens'
import { useStyles } from '@toned/react'
import { useMemo, useState } from 'react'
import { libraryStyles } from '../../styles/library.ts'
import { CodeBlock } from '../CodeBlock.tsx'

const initial = JSON.stringify(
  {
    space: {
      small: { $type: 'dimension', $value: { value: 8, unit: 'px' } },
      card: { $type: 'dimension', $value: '{space.small}' },
    },
  },
  null,
  2,
)
export function TokenDemo() {
  const s = useStyles(libraryStyles)
  const [source, setSource] = useState(initial)
  const result = useMemo(() => {
    try {
      const document: unknown = JSON.parse(source)
      const library = importDtcg(document)
      return { library, exported: exportDtcg(library), error: '' }
    } catch (error) {
      return { error: error instanceof Error ? error.message : String(error) }
    }
  }, [source])
  return (
    <div {...s.stack}>
      <label {...s.label} htmlFor="dtcg-source">
        DTCG document · edit the value or alias
      </label>
      <textarea
        id="dtcg-source"
        {...s.editor}
        value={source}
        maxLength={8000}
        spellCheck={false}
        aria-invalid={!!result.error}
        aria-describedby="dtcg-result"
        onChange={(event) => setSource(event.target.value)}
      />
      <p id="dtcg-result" {...s.muted}>
        {result.error ||
          (result.library?.resolved
            ? `${result.library.tokens.length} tokens resolved. Aliases retain their authored form on export.`
            : 'Diagnostics explain the unresolved values below.')}
      </p>
      {result.library && (
        <CodeBlock>
          {JSON.stringify(
            {
              tokens: result.library.tokens.map((token) => ({
                path: token.path.join('.'),
                value: token.value,
              })),
              diagnostics: result.library.diagnostics,
            },
            null,
            2,
          )}
        </CodeBlock>
      )}
      {result.exported && (
        <details>
          <summary>Round-trip export</summary>
          <CodeBlock>{JSON.stringify(result.exported, null, 2)}</CodeBlock>
        </details>
      )}
      <button type="button" onClick={() => setSource(initial)}>
        Reset token document
      </button>
      <p {...s.muted}>
        Runs the real importer in your browser. This bounded editor accepts
        8,000 characters. It demonstrates the documented DTCG subset; mapping
        imported values into a system’s theme remains explicit.
      </p>
    </div>
  )
}
