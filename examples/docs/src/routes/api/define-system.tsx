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
      <CodeBlock title="system.ts">{`import { defineSystem, defineToken } from '@toned/core'

export const ui = defineSystem({
  id: 'controls',
  tokens: {
    opacity: defineToken({
      values: [0, 0.5, 1] as const,
      resolve: opacity => ({ opacity }),
    }),
    padding: defineToken({
      values: [2, 4] as const,
      resolve: step => ({ padding: step * 4 }),
    }),
  },
  conditions: {
    media: { compact: 640, wide: 1024 },
    containers: { field: { wide: 448 } },
  },
})

export const { stylesheet } = ui`}</CodeBlock>
      <p>
        Sheets import <code {...s.code}>stylesheet</code> from this module. It
        is bound to the system, so token values and the conditions declared
        above are checked where they are used:
      </p>
      <CodeBlock title="styles.ts">{`import { stylesheet } from './system.ts'

export const styles = stylesheet(q => ({
  Root: {
    opacity: 0.5,
    padding: 2,
    [q.media('wide')]: { opacity: 1 },
    [q.container('field', 'wide')]: { padding: 4 },
  },
}))`}</CodeBlock>
      <h2 {...s.h2} id="token-and-condition-contracts">
        Token and condition contracts
      </h2>
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
      <h2 {...s.h2} id="use-the-complete-system">
        Use the complete system
      </h2>
      <CodeBlock title="build.ts">{`import { buildStyles } from '@toned/core/build'
import { createWebRenderer } from '@toned/core/server'
import { styles } from './styles.ts'
import { ui } from './system.ts'

const artifact = buildStyles(ui, { sheets: [styles] })
const renderer = createWebRenderer(ui, { manifest: artifact.manifest, tokens: {} })
const props = renderer.resolve(styles)`}</CodeBlock>
      <p>
        The <code {...s.code}>system</code> property is the raw token
        dictionary. Retaining only that property loses the system's
        configuration and identity; pass <code {...s.code}>ui</code> to new
        build/render integrations.
      </p>
      <h2 {...s.h2} id="compatibility">
        Compatibility
      </h2>
      <p>
        The older <code {...s.code}>defineSystem(tokens, config)</code> form and
        <code {...s.code}>t</code> utility remain available for existing
        consumers. New components should use named sheets and explicit bindings
        rather than introduce new ambient inline-token calls.
      </p>
    </article>
  )
}
