import { useStyles } from '@toned/react'
import { useEffect, useRef, useState } from 'react'
import { libraryStyles } from '../../styles/library.ts'
import { CodeBlock } from '../CodeBlock.tsx'

export function InspectorDemo() {
  const s = useStyles(libraryStyles)
  const container = useRef<HTMLDivElement>(null)
  const [enabled, setEnabled] = useState(false)
  const [status, setStatus] = useState(
    'The source compiler loads only when you open the inspector.',
  )
  const [source, setSource] = useState('')
  useEffect(() => {
    if (!enabled) return
    let active = true
    let dispose: (() => void) | undefined
    import('./inspector-session.ts')
      .then(({ mountInspectorSession }) => {
        if (!active || !container.current) return
        dispose = mountInspectorSession(container.current, setSource)
        setStatus(
          'Select Root → padding, choose a value, preview the change, then apply it.',
        )
      })
      .catch((error) => {
        if (active) setStatus(`Could not load inspector: ${String(error)}`)
      })
    return () => {
      active = false
      dispose?.()
    }
  }, [enabled])
  return (
    <div {...s.stack}>
      {!enabled && (
        <button
          {...s.input}
          type="button"
          onClick={() => {
            setEnabled(true)
            setStatus('Loading source compiler…')
          }}
        >
          Open the real source inspector
        </button>
      )}
      <p role="status" {...s.muted}>
        {status}
      </p>
      <div {...s.inspector.with({ ref: container })} />
      {source && (
        <details open>
          <summary>Current in-memory source</summary>
          <CodeBlock>{source}</CodeBlock>
        </details>
      )}
      <p {...s.muted}>
        This is Toned’s actual source inspector and checked edit pipeline,
        connected to one in-memory example. Changes never touch a repository or
        execute source. Reloading restores the example. The development bridge
        guide explains how to connect an authenticated, allowlisted local
        workspace.
      </p>
    </div>
  )
}
