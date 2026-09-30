import {
  type ContractReport,
  createScenarios,
  verifyContracts,
} from '@toned/compiler/contracts'
import { createInlineRenderer } from '@toned/core/server'
import { useStyles } from '@toned/react'
import { useRef, useState } from 'react'
import { libraryStyles } from '../../styles/library.ts'
import { CodeBlock } from '../CodeBlock.tsx'
import { documentSheet, documentSystem } from './DocumentDemo.tsx'

const renderer = createInlineRenderer(documentSystem, { tokens: {} })
const suite = createScenarios({ variants: { compact: [false] } })
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
        await verifyContracts({
          suite,
          resolve: (scenario) =>
            renderer.explain(documentSheet, { variants: scenario.variants }),
          measure: () => {
            const rect = target.current?.getBoundingClientRect()
            return rect
              ? { Root: { width: rect.width, height: rect.height } }
              : {}
          },
          contracts: [
            {
              id: 'touch-target',
              kind: 'interaction-size',
              part: 'Root',
              minWidth: 44,
              minHeight: 44,
            },
          ],
        }),
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
        {...renderer.resolve(documentSheet, { variants: { compact: false } })
          .Root}
        style={{
          ...renderer.resolve(documentSheet, { variants: { compact: false } })
            .Root.style,
          padding: 0,
          width: 160,
          height,
        }}
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
        <CodeBlock>
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
