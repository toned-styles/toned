import { useStyles } from '@toned/react'
import { useMemo, useState } from 'react'

import { libraryStyles } from '../../styles/library.ts'
import { CodeBlock } from '../CodeBlock.tsx'
import { exchangeTokens, initialDocument } from './token-exchange.ts'

export function TokenDemo() {
  const s = useStyles(libraryStyles)
  const [source, setSource] = useState(initialDocument)
  const result = useMemo(() => exchangeTokens(source), [source])
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
        <CodeBlock lang="json" title="Resolved tokens and diagnostics">
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
          <CodeBlock lang="json" title="exportDtcg(library)">
            {JSON.stringify(result.exported, null, 2)}
          </CodeBlock>
        </details>
      )}
      <button type="button" onClick={() => setSource(initialDocument)}>
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
