import { useStyles } from '@toned/react'
import {
  Component,
  createContext,
  type ErrorInfo,
  type ReactNode,
  useContext,
  useMemo,
} from 'react'
import type { DocDescriptor } from '../../../../ui/src/lib/doc'
import { playgroundStyles } from '../../styles/playground.ts'

const DocPropsContext = createContext<Record<string, Record<string, unknown>>>(
  {},
)

interface DocPreviewProps {
  doc: DocDescriptor
  propStates: Record<string, Record<string, unknown>>
}

export function DocPreview({ doc, propStates }: DocPreviewProps) {
  const s = useStyles(playgroundStyles)

  // Stable wrapper components — identity never changes, so React won't unmount/remount.
  // Each wrapper reads current prop values from context at render time.
  const C = useMemo(() => {
    const components: Record<string, React.ComponentType<any>> = {}
    for (const entry of doc.entries) {
      const Original = entry.component
      const entryName = entry.name
      const entryDefaults = entry.defaultProps
      components[entryName] = function DocWrapper(jsxProps: any) {
        const states = useContext(DocPropsContext)
        const merged = { ...entryDefaults, ...states[entryName], ...jsxProps }
        return <Original {...merged} />
      }
    }
    return components
  }, [doc.entries])

  return (
    <div {...s.preview}>
      <ErrorBoundary>
        <DocPropsContext.Provider value={propStates}>
          {doc.preview ? (
            doc.preview(C)
          ) : (
            <SimpleDocPreview entry={doc.entries[0]} />
          )}
        </DocPropsContext.Provider>
      </ErrorBoundary>
    </div>
  )
}

function SimpleDocPreview({
  entry,
}: {
  entry: DocDescriptor['entries'][0]
}) {
  const states = useContext(DocPropsContext)
  const Comp = entry.component
  const merged = { ...entry.defaultProps, ...states[entry.name] }

  return <Comp {...merged} />
}

class ErrorBoundary extends Component<
  { children: ReactNode },
  { error: Error | null }
> {
  state = { error: null as Error | null }

  static getDerivedStateFromError(error: Error) {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('DocPreview error:', error, info)
  }

  render() {
    if (this.state.error) {
      return (
        <div
          style={{
            padding: '12px 16px',
            borderRadius: '6px',
            background: '#fef2f2',
            color: '#dc2626',
            fontSize: '13px',
            fontFamily: 'monospace',
          }}
        >
          {this.state.error.message}
        </div>
      )
    }
    return this.props.children
  }
}
