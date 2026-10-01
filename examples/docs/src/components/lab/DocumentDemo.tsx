import { defineSystem, defineToken, type Variants } from '@toned/core'
import { createInlineRenderer, createPdfRenderer } from '@toned/core/server'
import { useStyles } from '@toned/react'
import { type CSSProperties, useState } from 'react'
import { libraryStyles } from '../../styles/library.ts'
import { CodeBlock } from '../CodeBlock.tsx'

export const documentSystem = defineSystem({
  id: 'lab-document',
  tokens: {
    padding: defineToken({
      values: [16, 24] as const,
      resolve: (value) => ({ padding: value }),
    }),
    surface: defineToken({
      values: ['tint'] as const,
      resolve: () => ({ backgroundColor: '#eef2ff' }),
    }),
    radius: defineToken({
      values: [12] as const,
      resolve: (value) => ({ borderRadius: value }),
    }),
    text: defineToken({
      values: ['body'] as const,
      resolve: () => ({ color: '#182554', fontSize: 16 }),
    }),
  },
})
export const documentSheet = documentSystem
  .stylesheet({
    Root: {
      $kind: 'text',
      padding: 24,
      surface: 'tint',
      radius: 12,
      text: 'body',
    },
  })
  .variants(($: Variants<{ compact: boolean }>) => ({
    [$.compact(true)]: { Root: { padding: 16 } },
  }))
const inline = createInlineRenderer(documentSystem, { tokens: {} })
const pdf = createPdfRenderer(documentSystem, { tokens: {} })
export function DocumentDemo() {
  const s = useStyles(libraryStyles)
  const [compact, setCompact] = useState(false)
  const emailOutput = inline.resolve(documentSheet, {
    variants: { compact },
  }).Root
  const pdfOutput = pdf.resolve(documentSheet, { variants: { compact } }).Root
  return (
    <div {...s.stack}>
      <label>
        <input
          type="checkbox"
          checked={compact}
          onChange={(event) => setCompact(event.target.checked)}
        />{' '}
        Compact document variant
      </label>
      <div style={emailOutput.style as CSSProperties}>
        <strong>You’re on the list.</strong>
        <p>This HTML preview uses the exact inline renderer output below.</p>
      </div>
      <div {...s.grid}>
        <section>
          <h3>Inline HTML / email</h3>
          <CodeBlock>{JSON.stringify(emailOutput, null, 2)}</CodeBlock>
        </section>
        <section>
          <h3>PDF style output</h3>
          <CodeBlock>{JSON.stringify(pdfOutput, null, 2)}</CodeBlock>
        </section>
      </div>
      <p {...s.muted}>
        Both outputs come from the same sheet and variant. PDF values are
        document points. This shows resolved styles, not a generated PDF or
        email-client compatibility test.
      </p>
    </div>
  )
}
