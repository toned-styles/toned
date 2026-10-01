import { useStyles } from '@toned/react'
import { type CSSProperties, useState } from 'react'
import { experimentStyles } from '../../styles/site.ts'
import { CodeBlock } from '../CodeBlock.tsx'
import { inline, pdf } from './document.renderers.ts'
import { documentSheet } from './document.styles.ts'

export function DocumentDemo() {
  const s = useStyles(experimentStyles)
  const [compact, setCompact] = useState(false)
  const variants = { compact }
  const emailOutput = inline.resolve(documentSheet, { variants }).Root
  const pdfOutput = pdf.resolve(documentSheet, { variants }).Root
  return (
    <div {...s.Output}>
      <label>
        <input
          type="checkbox"
          checked={compact}
          onChange={(event) => setCompact(event.target.checked)}
        />{' '}
        Compact document variant
      </label>
      <div {...s.Cell}>
        <span {...s.Layer}>HTML preview</span>
        <div style={emailOutput.style as CSSProperties}>
          <strong>You’re on the list.</strong>
          <p>This preview is styled by the inline output below.</p>
        </div>
      </div>
      <div {...s.Pair}>
        <section {...s.Cell} data-output="email" aria-labelledby="email-output">
          <h3 id="email-output" {...s.Layer}>
            Inline HTML / email
          </h3>
          <div {...s.Source}>
            <CodeBlock bare lang="json" title="inline.resolve(…).Root">
              {JSON.stringify(emailOutput, null, 2)}
            </CodeBlock>
          </div>
        </section>
        <section {...s.Cell} data-output="pdf" aria-labelledby="pdf-output">
          <h3 id="pdf-output" {...s.Layer}>
            PDF style output
          </h3>
          <div {...s.Source}>
            <CodeBlock bare lang="json" title="pdf.resolve(…).Root">
              {JSON.stringify(pdfOutput, null, 2)}
            </CodeBlock>
          </div>
        </section>
      </div>
      <p {...s.Note}>
        Both outputs come from the same sheet and variant. PDF values are
        document points. This shows resolved styles, not a generated PDF or
        email-client compatibility test.
      </p>
    </div>
  )
}
