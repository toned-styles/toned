import { createFileRoute } from '@tanstack/react-router'
import { useStyles } from '@toned/react'
import { useEffect, useState, useCallback, useRef } from 'react'
import { ComponentPreview } from '../../components/playground/ComponentPreview.tsx'
import { DocPreview } from '../../components/playground/DocPreview.tsx'
import { PropControls } from '../../components/playground/PropControls.tsx'
import { componentModules } from '../../lib/component-registry.ts'
import type { DocDescriptor } from '../../../../ui/src/lib/doc'
import { playgroundStyles } from '../../styles/playground.ts'
import type { ComponentDoc, PropDoc } from 'virtual:component-docs/*'

export const Route = createFileRoute('/ui/$component')({
  component: ComponentPlayground,
})

function ComponentPlayground() {
  const { component: name } = Route.useParams()
  const s = useStyles(playgroundStyles)

  const [docs, setDocs] = useState<ComponentDoc[] | null>(null)
  const [mod, setMod] = useState<Record<string, unknown> | null>(null)
  const [docDescriptor, setDocDescriptor] = useState<DocDescriptor | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setDocs(null)
    setMod(null)
    setDocDescriptor(null)
    setError(null)

    const loadDocs = async () => {
      const { loaders } = await import('virtual:component-docs/index')
      const loader = loaders[name]
      if (!loader) return null
      const result = await loader()
      return result.default
    }

    const loadDocDescriptor = async () => {
      // Doc glob is intentionally inline (not in component-registry) to keep it
      // out of the Sidebar → __root.tsx import chain, avoiding the routeTree regen loop.
      const docGlob = import.meta.glob<{ default: DocDescriptor }>(
        '../../../../ui/src/components/ui/*.doc.tsx',
      )
      const match = Object.entries(docGlob).find(([p]) =>
        p.endsWith(`/${name}.doc.tsx`),
      )
      if (!match) return null
      const result = await match[1]()
      return result.default
    }

    Promise.all([loadDocs(), componentModules[name]?.(), loadDocDescriptor()])
      .then(([docData, modData, descriptor]) => {
        setDocDescriptor(descriptor ?? null)
        setMod(modData ?? null)

        // If we have a doc descriptor, we don't require react-docgen data
        if (descriptor) {
          setDocs(docData?.filter(
            (d: ComponentDoc) => /^[A-Z]/.test(d.displayName),
          ) ?? [])
          return
        }

        if (!docData || docData.length === 0) {
          setError(`No documentation found for "${name}"`)
          return
        }
        const componentDocs = docData.filter(
          (d: ComponentDoc) => /^[A-Z]/.test(d.displayName),
        )
        if (componentDocs.length === 0) {
          setError(`No components found in "${name}"`)
          return
        }
        setDocs(componentDocs)
      })
      .catch((err) => {
        setError(String(err.message || err))
      })
  }, [name])

  if (error) {
    return (
      <div {...s.container}>
        <div {...s.errorBanner}>{error}</div>
      </div>
    )
  }

  if (!mod || (docs === null && !docDescriptor)) {
    return (
      <div {...s.container}>
        <div {...s.readOnly}>Loading {name}...</div>
      </div>
    )
  }

  // Doc descriptor path — type-safe previews
  if (docDescriptor) {
    return (
      <DocPlayground
        doc={docDescriptor}
        docgenDocs={docs ?? []}
      />
    )
  }

  // Fallback: react-docgen-typescript only
  const isCompound = docs!.length > 1
  const primaryDoc = docs![0]

  return (
    <div {...s.container}>
      <div>
        <div {...s.title}>{primaryDoc.displayName}</div>
        {primaryDoc.description && (
          <div {...s.description}>{primaryDoc.description}</div>
        )}
        {isCompound && (
          <div {...s.exportBadge}>
            Exports: {docs!.map((d) => d.displayName).join(', ')}
          </div>
        )}
      </div>

      {isCompound ? (
        <CompoundPlayground docs={docs!} mod={mod} />
      ) : (
        <SimplePlayground doc={primaryDoc} mod={mod} />
      )}
    </div>
  )
}

/** Read prop overrides from URL search params.
 *  Format: `?ComponentName.propName=value` */
function readPropsFromUrl(): Record<string, Record<string, string>> {
  const params = new URLSearchParams(window.location.search)
  const result: Record<string, Record<string, string>> = {}
  for (const [key, value] of params) {
    const dot = key.indexOf('.')
    if (dot === -1) continue
    const comp = key.slice(0, dot)
    const prop = key.slice(dot + 1)
    if (!result[comp]) result[comp] = {}
    result[comp][prop] = value
  }
  return result
}

/** Write prop states to URL search params via replaceState (no navigation). */
function writePropsToUrl(
  propStates: Record<string, Record<string, unknown>>,
  defaults: Record<string, Record<string, unknown>>,
) {
  const params = new URLSearchParams()
  for (const [comp, props] of Object.entries(propStates)) {
    const defs = defaults[comp] ?? {}
    for (const [key, value] of Object.entries(props)) {
      // Only include props that differ from defaults
      if (value !== defs[key] && value != null && value !== '') {
        params.set(`${comp}.${key}`, String(value))
      }
    }
  }
  const qs = params.toString()
  const url = window.location.pathname + (qs ? `?${qs}` : '')
  window.history.replaceState(null, '', url)
}

/** Doc-descriptor-based playground with per-component prop controls */
function DocPlayground({
  doc,
  docgenDocs,
}: {
  doc: DocDescriptor
  docgenDocs: ComponentDoc[]
}) {
  const s = useStyles(playgroundStyles)

  // Build a lookup from component name to docgen metadata (for control types)
  const docgenByName: Record<string, ComponentDoc> = {}
  for (const d of docgenDocs) {
    docgenByName[d.displayName] = d
  }

  // Build defaults once for URL diffing
  const defaultsRef = useRef<Record<string, Record<string, unknown>>>({})
  if (Object.keys(defaultsRef.current).length === 0) {
    for (const entry of doc.entries) {
      defaultsRef.current[entry.name] = { ...entry.defaultProps }
    }
  }

  // Initialize prop states: defaults merged with URL overrides
  const [propStates, setPropStates] = useState<
    Record<string, Record<string, unknown>>
  >(() => {
    const urlOverrides = readPropsFromUrl()
    const states: Record<string, Record<string, unknown>> = {}
    for (const entry of doc.entries) {
      states[entry.name] = {
        ...entry.defaultProps,
        ...urlOverrides[entry.name],
      }
    }
    return states
  })

  // Sync prop states to URL
  useEffect(() => {
    writePropsToUrl(propStates, defaultsRef.current)
  }, [propStates])

  const updatePropState = useCallback(
    (componentName: string, prop: string, value: unknown) => {
      setPropStates((prev) => ({
        ...prev,
        [componentName]: { ...prev[componentName], [prop]: value },
      }))
    },
    [],
  )

  const primaryName = doc.entries[0].name
  const isCompound = doc.entries.length > 1

  return (
    <div {...s.container}>
      <div>
        <div {...s.title}>{primaryName}</div>
        {isCompound && (
          <div {...s.exportBadge}>
            Exports: {doc.entries.map((e) => e.name).join(', ')}
          </div>
        )}
      </div>

      <DocPreview doc={doc} propStates={propStates} />

      {doc.entries.map((entry) => {
        const docgen = docgenByName[entry.name]
        if (!docgen) return null
        return (
          <PropControls
            key={entry.name}
            title={isCompound ? `${entry.name} props` : undefined}
            props={docgen.props}
            values={propStates[entry.name] ?? {}}
            onChange={(prop, value) =>
              updatePropState(entry.name, prop, value)
            }
          />
        )
      })}
    </div>
  )
}

/** Single-export component: live preview + prop controls (fallback) */
function SimplePlayground({
  doc,
  mod,
}: {
  doc: ComponentDoc
  mod: Record<string, unknown>
}) {
  const Comp = mod[doc.displayName] as React.ComponentType<
    Record<string, unknown>
  > | null

  const [propValues, setPropValues] = useState<Record<string, unknown>>(() =>
    initializeProps(doc.props),
  )

  return (
    <>
      <ComponentPreview component={Comp} props={propValues} />
      <PropControls
        props={doc.props}
        values={propValues}
        onChange={(name, value) =>
          setPropValues((prev) => ({ ...prev, [name]: value }))
        }
      />
    </>
  )
}

/** Multi-export compound component: show props for each sub-component (fallback) */
function CompoundPlayground({
  docs,
}: {
  docs: ComponentDoc[]
  mod: Record<string, unknown>
}) {
  const s = useStyles(playgroundStyles)

  return (
    <>
      <div {...s.preview}>
        <div {...s.compoundNotice}>
          <span>
            This is a composed component with {docs.length} sub-components.
          </span>
          <span>
            Add an <code>@example</code> JSDoc tag to see a live preview.
          </span>
        </div>
      </div>
      {docs.map((doc) => {
        const propEntries = Object.entries(doc.props).filter(
          ([name]) => name !== 'ref' && name !== 'key',
        )
        if (propEntries.length === 0) return null
        return (
          <div key={doc.displayName} {...s.controls}>
            <div {...s.controlsTitle}>{doc.displayName} props</div>
            <div {...s.controlGrid}>
              {propEntries.map(([name, prop]) => (
                <div key={name} {...s.controlRow}>
                  <span
                    style={{
                      fontWeight: 500,
                      fontSize: '13px',
                      minWidth: '120px',
                    }}
                  >
                    {name}
                    {prop.required ? ' *' : ''}
                  </span>
                  <span {...s.readOnly}>{prop.type.name}</span>
                </div>
              ))}
            </div>
          </div>
        )
      })}
    </>
  )
}

function initializeProps(
  props: Record<string, PropDoc>,
): Record<string, unknown> {
  const values: Record<string, unknown> = {}
  for (const [name, prop] of Object.entries(props)) {
    if (name === 'ref' || name === 'key') continue
    if (prop.preview) {
      values[name] = coerceValue(prop.preview, prop.type.name)
    } else if (prop.defaultValue?.value != null) {
      values[name] = coerceValue(String(prop.defaultValue.value), prop.type.name)
    } else if (name === 'children') {
      values[name] = 'Example'
    }
  }
  return values
}

function coerceValue(raw: string, typeName: string): unknown {
  if (typeName === 'boolean') return raw === 'true'
  if (typeName === 'number') return Number(raw)
  return raw
}
