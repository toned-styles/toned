import { Link } from '@tanstack/react-router'
import { useStyles } from '@toned/react'
import { docsStyles, experimentStyles } from '../../styles/site.ts'
import systemSource from '../../styles/system.ts?raw'
import { CodeBlock } from '../CodeBlock.tsx'
import { AdaptiveDemo } from './AdaptiveDemo.tsx'
import adaptiveDemoSource from './AdaptiveDemo.tsx?raw'
import adaptiveStylesSource from './adaptive.styles.ts?raw'
import { ContractDemo } from './ContractDemo.tsx'
import contractDemoSource from './ContractDemo.tsx?raw'
import { DocumentDemo } from './DocumentDemo.tsx'
import documentDemoSource from './DocumentDemo.tsx?raw'
import documentRenderersSource from './document.renderers.ts?raw'
import documentStylesSource from './document.styles.ts?raw'
import documentSystemSource from './document.system.ts?raw'
import { GridDemo } from './GridDemo.tsx'
import gridDemoSource from './GridDemo.tsx?raw'
import gridStylesSource from './grid.styles.ts?raw'
import { InspectorDemo } from './InspectorDemo.tsx'
import inspectorDemoSource from './InspectorDemo.tsx?raw'
import inspectorSessionSource from './inspector-session.ts?raw'
import { type LayerFile, LayerSource } from './LayerSource.tsx'
import { MotionDemo } from './MotionDemo.tsx'
import motionDemoSource from './MotionDemo.tsx?raw'
import motionStylesSource from './motion.styles.ts?raw'
import { TokenDemo } from './TokenDemo.tsx'
import tokenDemoSource from './TokenDemo.tsx?raw'
import tokenExchangeSource from './token-exchange.ts?raw'
import contractSource from './touch-target.contract.ts?raw'

interface Example {
  id: string
  /** The section's anchor when it differs from the reference topic `id`. */
  anchor?: string
  label: string
  title: string
  summary: string
  Demo: () => React.ReactNode
  /** Shown above the demo when the declaration is the subject. */
  lead?: LayerFile
  /** Caption for the demo when a lead precedes it. */
  demoLabel?: string
  /** Caption for the remaining files; they read as supporting material. */
  restLabel?: string
  /** The modules that run, by layer: styles, component, then configuration. */
  files: LayerFile[]
}

// The site's own system: the web examples' sheets import `stylesheet` from it.
const siteSystem: LayerFile = {
  layer: 'System',
  file: 'system.ts',
  source: systemSource,
}
const documentStyles: LayerFile = {
  layer: 'Styles',
  file: 'document.styles.ts',
  source: documentStylesSource,
}
const documentSystem: LayerFile = {
  layer: 'System',
  file: 'document.system.ts',
  source: documentSystemSource,
}
const documentRenderers: LayerFile = {
  layer: 'Renderers',
  file: 'document.renderers.ts',
  source: documentRenderersSource,
}

const demos: Example[] = [
  {
    id: 'adaptive',
    label: 'Adaptive',
    title: 'Adaptive layout',
    summary:
      'Change the available width or the text scale; the component picks the layout variant that fits.',
    Demo: AdaptiveDemo,
    files: [
      {
        layer: 'Styles',
        file: 'adaptive.styles.ts',
        source: adaptiveStylesSource,
      },
      {
        layer: 'Component',
        file: 'AdaptiveDemo.tsx',
        source: adaptiveDemoSource,
      },
      siteSystem,
    ],
  },
  {
    id: 'motion',
    label: 'Motion',
    title: 'Motion',
    summary:
      'Springs, interruption and retained exits, driven by the host that owns the styles.',
    Demo: MotionDemo,
    files: [
      { layer: 'Styles', file: 'motion.styles.ts', source: motionStylesSource },
      { layer: 'Component', file: 'MotionDemo.tsx', source: motionDemoSource },
      siteSystem,
    ],
  },
  {
    id: 'core',
    label: 'Grid',
    anchor: 'grid',
    title: 'Typed grid',
    summary:
      'Rearrange typed grid areas without changing the component’s structure.',
    Demo: GridDemo,
    files: [
      { layer: 'Styles', file: 'grid.styles.ts', source: gridStylesSource },
      { layer: 'Component', file: 'GridDemo.tsx', source: gridDemoSource },
      siteSystem,
    ],
  },
  {
    id: 'renderers',
    label: 'Renderers',
    title: 'Email and PDF output',
    summary:
      'One stylesheet resolved to inline HTML email styles and to a PDF style profile.',
    Demo: DocumentDemo,
    lead: documentStyles,
    demoLabel: 'Output',
    restLabel: 'Configuration',
    files: [
      documentSystem,
      documentRenderers,
      {
        layer: 'Component',
        file: 'DocumentDemo.tsx',
        source: documentDemoSource,
      },
    ],
  },
  {
    id: 'tokens',
    label: 'Tokens',
    title: 'Token exchange',
    summary:
      'Resolve an alias, read the diagnostics and round-trip a DTCG token document.',
    Demo: TokenDemo,
    files: [
      {
        layer: 'Exchange',
        file: 'token-exchange.ts',
        source: tokenExchangeSource,
      },
      { layer: 'Component', file: 'TokenDemo.tsx', source: tokenDemoSource },
    ],
  },
  {
    id: 'contracts',
    label: 'Contracts',
    title: 'Measured contracts',
    summary:
      'A contract measures the rendered element and checks it against the declaration.',
    Demo: ContractDemo,
    lead: {
      layer: 'Contract',
      file: 'touch-target.contract.ts',
      source: contractSource,
    },
    demoLabel: 'Measurement',
    restLabel: 'Styles and configuration',
    files: [
      documentStyles,
      {
        layer: 'Component',
        file: 'ContractDemo.tsx',
        source: contractDemoSource,
      },
      documentSystem,
      documentRenderers,
    ],
  },
  {
    id: 'inspector',
    label: 'Inspector',
    title: 'Source inspector',
    summary:
      'Inspect a declaration, preview an edit and apply it against the current source revision.',
    Demo: InspectorDemo,
    files: [
      {
        layer: 'Session',
        file: 'inspector-session.ts',
        source: inspectorSessionSource,
      },
      {
        layer: 'Component',
        file: 'InspectorDemo.tsx',
        source: inspectorDemoSource,
      },
    ],
  },
]

export function Examples() {
  const d = useStyles(docsStyles)
  const s = useStyles(experimentStyles)
  return (
    <article>
      <h1 {...d.Title}>Interactive examples</h1>
      <p {...d.Lead}>
        Seven examples you can operate, each running the API it shows. The
        source beside each one is the code that runs, split by layer: styles,
        component, and system or configuration.
      </p>
      <nav {...s.Jump} aria-label="Examples">
        {demos.map((demo, index) => (
          <a key={demo.id} href={`#${demo.anchor ?? demo.id}`} {...s.Chip}>
            {String(index + 1).padStart(2, '0')} · {demo.label}
          </a>
        ))}
      </nav>
      {demos.map((demo, index) => {
        const { id, title, summary, Demo, lead, files } = demo
        return (
          <section
            key={id}
            id={demo.anchor ?? id}
            {...s.Section}
            aria-labelledby={`${id}-title`}
          >
            <div {...s.Head}>
              <span {...s.Number} aria-hidden="true">
                {String(index + 1).padStart(2, '0')}
              </span>
              <div>
                <h2 id={`${id}-title`} {...s.Title}>
                  {title}
                </h2>
                <p {...s.Summary}>{summary}</p>
              </div>
            </div>
            {lead && (
              <div {...s.Block}>
                <span {...s.Layer}>{lead.layer}</span>
                <div {...s.Source}>
                  <CodeBlock bare title={lead.file}>
                    {lead.source}
                  </CodeBlock>
                </div>
              </div>
            )}
            <div {...s.Block}>
              {lead && <span {...s.Layer}>{demo.demoLabel}</span>}
              <div {...s.Stage} data-toc-skip>
                <Demo />
              </div>
            </div>
            <div {...s.Block}>
              <span {...s.Layer}>
                {lead ? demo.restLabel : 'Source, by layer'}
              </span>
              <LayerSource
                id={`${id}-source`}
                label={`${title} source`}
                files={files}
                quiet={!!lead}
                maxHeight={lead ? 300 : 420}
              />
            </div>
            <div {...s.Footer}>
              <Link to="/learn/$topic" params={{ topic: id }} {...s.Link}>
                Reference →
              </Link>
            </div>
          </section>
        )
      })}
    </article>
  )
}
