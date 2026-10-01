import type { ComponentDoc, PropDoc } from 'virtual:component-docs/*'
import { createFileRoute, Link } from '@tanstack/react-router'
import { useStyles } from '@toned/react'
import { useCallback, useEffect, useRef, useState } from 'react'
import type { DocDescriptor } from '../../../../ui/src/lib/doc.tsx'
import { ComponentPreview } from '../../components/playground/ComponentPreview.tsx'
import { DocPreview } from '../../components/playground/DocPreview.tsx'
import {
  PropControls,
  type PropGroup,
} from '../../components/playground/PropControls.tsx'
import { StylesheetWorkbench } from '../../components/playground/StylesheetWorkbench.tsx'
import { componentModules } from '../../lib/component-registry.ts'
import { playgroundStyles } from '../../styles/playground.ts'
import { docsStyles } from '../../styles/site.ts'

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
    let active = true
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
        if (!active) return
        setDocDescriptor(descriptor ?? null)
        setMod(modData ?? null)

        // If we have a doc descriptor, we don't require react-docgen data
        if (descriptor) {
          setDocs(
            docData?.filter((d: ComponentDoc) =>
              /^[A-Z]/.test(d.displayName),
            ) ?? [],
          )
          return
        }

        if (!docData || docData.length === 0) {
          setDocs([])
          return
        }
        const componentDocs = docData.filter((d: ComponentDoc) =>
          /^[A-Z]/.test(d.displayName),
        )

        setDocs(componentDocs)
      })
      .catch((err: unknown) => {
        if (active) setError(err instanceof Error ? err.message : String(err))
      })
    return () => {
      active = false
    }
  }, [name])

  if (error) {
    return (
      <div {...s.container}>
        <div role="alert" {...s.errorBanner}>
          {error}
        </div>
      </div>
    )
  }

  if (!mod || (docs === null && !docDescriptor)) {
    return (
      <div {...s.container}>
        <p {...s.loading}>Loading {name}…</p>
      </div>
    )
  }

  // Doc descriptor path — type-safe previews
  if (docDescriptor) {
    return (
      <DocPlayground
        key={name}
        name={name}
        mod={mod}
        doc={docDescriptor}
        docgenDocs={docs ?? []}
      />
    )
  }

  // Fallback: react-docgen-typescript only. A route change or an empty metadata
  // result must not turn an absent primary entry into a render-time crash.
  const primaryDoc = docs?.[0]
  const isCompound = (docs?.length ?? 0) > 1

  return (
    <div {...s.container}>
      <PageHeader
        title={pageTitle(name)}
        description={primaryDoc?.description}
        exports={isCompound ? docs?.map((d) => d.displayName) : undefined}
      />
      {primaryDoc && !isCompound ? (
        <SimplePlayground key={name} name={name} doc={primaryDoc} mod={mod} />
      ) : (
        <StylesheetWorkbench key={name} name={name} mod={mod}>
          <div {...s.preview} data-preview-stage>
            <p {...s.compoundNotice}>
              This component has no example yet. Its source is shown alongside.
            </p>
          </div>
        </StylesheetWorkbench>
      )}
    </div>
  )
}

/** The page is named after the component file, as the sidebar is. */
function pageTitle(name: string) {
  return name
    .split('-')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

function PageHeader({
  title,
  description,
  exports,
}: {
  title: string
  description?: string
  exports?: string[]
}) {
  const s = useStyles(playgroundStyles)
  const d = useStyles(docsStyles)
  return (
    <header {...s.header}>
      <p {...d.Breadcrumb}>
        <Link to="/ui">Components</Link>
      </p>
      <h1 {...s.title}>{title}</h1>
      {description && <p {...s.description}>{description}</p>}
      {exports && exports.length > 1 && (
        <p {...s.exportBadge}>Exports: {exports.join(', ')}</p>
      )}
    </header>
  )
}

/** Read prop overrides from URL search params.
 *  Format: `?ComponentName.propName=value` */
function readPropsFromUrl(): Record<string, Record<string, string>> {
  const params = new URLSearchParams(window.location.search)
  const result: Record<string, Record<string, string>> = {}
  for (const [key, value] of [...params].slice(0, 100)) {
    const dot = key.indexOf('.')
    if (dot === -1) continue
    const comp = key.slice(0, dot)
    const prop = key.slice(dot + 1)
    if (
      !/^[A-Z][a-zA-Z0-9]*$/.test(comp) ||
      !/^[a-zA-Z][a-zA-Z0-9-]*$/.test(prop) ||
      ['constructor', 'prototype'].includes(prop) ||
      value.length > 2000
    )
      continue
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
  name,
  mod,
}: {
  name: string
  mod: Record<string, unknown>
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
        ...Object.fromEntries(
          Object.entries(urlOverrides[entry.name] ?? {}).map(([key, value]) => [
            key,
            coerceValue(
              value,
              docgenByName[entry.name]?.props[key]?.type.name ??
                typeof entry.defaultProps[key],
            ),
          ]),
        ),
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

  const isCompound = doc.entries.length > 1
  // The docs module exports every part; the descriptor lists the ones its
  // example uses.
  const exported = Object.keys(mod).filter((key) => /^[A-Z]/.test(key))

  const groups = doc.entries.map((entry): PropGroup => {
    const docgen = docgenByName[entry.name]
    const props = { ...docgen?.props }
    for (const [name, value] of Object.entries(entry.defaultProps)) {
      if (
        props[name] ||
        !['string', 'number', 'boolean'].includes(typeof value)
      )
        continue
      props[name] = {
        name,
        type: { name: typeof value },
        required: false,
        description: '',
        defaultValue: { value: String(value) },
      }
    }
    return {
      title: isCompound ? entry.name : undefined,
      props,
      values: propStates[entry.name] ?? {},
      onChange: (prop, value) => updatePropState(entry.name, prop, value),
    }
  })

  return (
    <div {...s.container}>
      <PageHeader
        title={pageTitle(name)}
        description={doc.description}
        exports={exported}
      />
      <StylesheetWorkbench
        key={name}
        name={name}
        mod={mod}
        controls={<PropControls groups={groups} />}
      >
        <DocPreview doc={doc} propStates={propStates} />
      </StylesheetWorkbench>
    </div>
  )
}

/** Single-export component: live preview + prop controls (fallback) */
function SimplePlayground({
  name,
  doc,
  mod,
}: {
  name: string
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
    <StylesheetWorkbench
      key={name}
      name={name}
      mod={mod}
      controls={
        <PropControls
          groups={[
            {
              props: doc.props,
              values: propValues,
              onChange: (name, value) =>
                setPropValues((prev) => ({ ...prev, [name]: value })),
            },
          ]}
        />
      }
    >
      <ComponentPreview component={Comp} props={propValues} />
    </StylesheetWorkbench>
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
      values[name] = coerceValue(
        String(prop.defaultValue.value),
        prop.type.name,
      )
    } else if (name === 'children') {
      values[name] = 'Example'
    }
  }
  return values
}

function coerceValue(raw: string, typeName: string): unknown {
  typeName = typeName
    .split(' | ')
    .filter((value) => value !== 'undefined' && value !== 'null')
    .join(' | ')
  if (typeName === 'boolean') return raw === 'true'
  if (typeName === 'number') return Number(raw)
  return raw
}
