import { useStyles } from '@toned/react'
import { createContext, useContext, useMemo } from 'react'
import type { DocDescriptor } from '../../../../ui/src/lib/doc.tsx'
import { playgroundStyles } from '../../styles/playground.ts'
import { PreviewBoundary } from './PreviewBoundary.tsx'

/** A cleared control means "not set": the component's own default applies. */
function clean(props: Record<string, unknown>) {
  return Object.fromEntries(
    Object.entries(props).filter(
      ([, value]) =>
        value !== '' && !(typeof value === 'number' && Number.isNaN(value)),
    ),
  )
}

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
    const components: Record<
      string,
      React.ComponentType<Record<string, unknown>>
    > = {}
    for (const entry of doc.entries) {
      const Original = entry.component
      const entryName = entry.name
      const entryDefaults = entry.defaultProps
      components[entryName] = function DocWrapper(
        jsxProps: Record<string, unknown>,
      ) {
        const states = useContext(DocPropsContext)
        const merged = { ...entryDefaults, ...states[entryName], ...jsxProps }
        return <Original {...clean(merged)} />
      }
    }
    return components
  }, [doc.entries])

  return (
    <div {...s.preview} data-preview-stage>
      <PreviewBoundary>
        <DocPropsContext.Provider value={propStates}>
          {doc.preview ? (
            doc.preview(C)
          ) : (
            <SimpleDocPreview entry={doc.entries[0]} />
          )}
        </DocPropsContext.Provider>
      </PreviewBoundary>
    </div>
  )
}

function SimpleDocPreview({
  entry,
}: {
  entry: DocDescriptor['entries'][0] | undefined
}) {
  const states = useContext(DocPropsContext)
  if (!entry) return <p>No documented component.</p>
  const Comp = entry.component
  const merged = { ...entry.defaultProps, ...states[entry.name] }

  return <Comp {...clean(merged)} />
}
