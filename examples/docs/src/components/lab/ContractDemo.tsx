import type { ContractReport } from '@toned/compiler/contracts'
import { useStyles } from '@toned/react'
import { useRef, useState } from 'react'
import { libraryStyles } from '../../styles/library.ts'
import { CodeBlock } from '../CodeBlock.tsx'
import { inline } from './document.renderers.ts'
import { documentSheet } from './document.styles.ts'
import { verifyTouchTarget } from './touch-target.contract.ts'

// The specimen is the document sheet's Root, resolved to inline styles.
const specimen = inline.resolve(documentSheet, {
  variants: { compact: false },
}).Root

export function ContractDemo() {
  const s = useStyles(libraryStyles)
  const target = useRef<HTMLButtonElement>(null)
  const [height, setHeight] = useState(48)
  const [report, setReport] = useState<ContractReport | null>(null)
  const [running, setRunning] = useState(false)
  async function measure() {
    setRunning(true)
    try {
      setReport(
        await verifyTouchTarget(() => target.current?.getBoundingClientRect()),
      )
    } finally {
      setRunning(false)
    }
  }
  return (
    <div {...s.stack}>
      <label>
        Measured target height · {height}px
        <input
          aria-label="Measured target height"
          type="range"
          min={24}
          max={64}
          value={height}
          onChange={(event) => {
            setHeight(Number(event.target.value))
            setReport(null)
          }}
        />
      </label>
      <button
        ref={target}
        {...specimen}
        style={{ ...specimen.style, padding: 0, width: 160, height }}
        type="button"
      >
        Measured specimen
      </button>
      <button {...s.input} type="button" onClick={measure} disabled={running}>
        Measure this target
      </button>
      <p role="status">
        {report
          ? `${report.status.toUpperCase()} · ${report.passed} passed, ${report.failed} failed, ${report.inconclusive} inconclusive`
          : 'Choose a size, then measure the rendered button.'}
      </p>
      {report && (
        <CodeBlock lang="json" title="Contract report">
          {JSON.stringify(
            {
              coverage: report.coverage,
              findings: report.findings.map(({ reason, evidence }) => ({
                reason,
                evidence,
              })),
            },
            null,
            2,
          )}
        </CodeBlock>
      )}
      <p {...s.muted}>
        One real DOM measurement, one explicit 44 × 44 policy. Below 44px, this
        check fails. This demonstrates measurement-backed verification; it does
        not claim a complete accessibility audit or unvisited scenario coverage.
      </p>
    </div>
  )
}
