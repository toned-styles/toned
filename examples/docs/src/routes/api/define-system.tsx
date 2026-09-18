import { createFileRoute } from '@tanstack/react-router'
import { useStyles } from '@toned/react'
import { CodeBlock } from '../../components/CodeBlock.tsx'
import { proseStyles } from '../../styles/prose.ts'

export const Route = createFileRoute('/api/define-system')({
  component: ApiDefineSystem,
})

function ApiDefineSystem() {
  const s = useStyles(proseStyles)
  return (
    <article {...s.container}>
      <h1 {...s.h1}>defineSystem</h1>
      <p>
        A system owns the typed token vocabulary, conditions and namespace used
        by its sheets. Keep the complete returned object for renderers and
        builds.
      </p>
      <CodeBlock>{`import { defineSystem, defineToken } from '@toned/core'

export const ui = defineSystem({
  id: 'controls',
  tokens: {
    opacity: defineToken({
      values: [0, 0.5, 1] as const,
      resolve: opacity => ({ opacity }),
    }),
  },
  conditions: {
    media: { compact: 640, wide: 1024 },
    containers: { field: { wide: 448 } },
  },
})

export const styles = ui.stylesheet(q => ({
  Root: {
    $kind: 'view',
    opacity: 0.5,
    [q.media('wide')]: { opacity: 1 },
    [q.container('field', 'wide')]: { $style: { padding: 16 } },
  },
}))`}</CodeBlock>
      <h2 {...s.h2}>Token and condition contracts</h2>
      <p>
        Token properties use camelCase; named values use kebab-case. Resolvers
        translate semantic values into output fields and may read the current
        token snapshot. Declarations and compiled matching plans are immutable.
      </p>
      <p>
        Descriptor-system media and container thresholds are fixed logical
        pixels. Query preludes cannot read CSS custom properties. Colocated
        conditions use the same typed builder in base and variant declarations.
      </p>
      <h2 {...s.h2}>Use the complete system</h2>
      <CodeBlock>{`import { buildStyles } from '@toned/core/build'
import { createWebRenderer } from '@toned/core/server'

const artifact = buildStyles(ui, { sheets: [styles] })
const renderer = createWebRenderer(ui, { manifest: artifact.manifest, tokens: {} })
const props = renderer.resolve(styles)`}</CodeBlock>
      <p>
        The <code {...s.code}>system</code> property is the raw token
        dictionary. Retaining only that property loses the system's
        configuration and identity; pass <code {...s.code}>ui</code> to new
        build/render integrations.
      </p>
      <h2 {...s.h2}>Compatibility</h2>
      <p>
        The older <code {...s.code}>defineSystem(tokens, config)</code> form and
        <code {...s.code}>t</code> utility remain available for existing
        consumers. New components should use named sheets and explicit bindings
        rather than introduce new ambient inline-token calls.
      </p>
    </article>
  )
}
