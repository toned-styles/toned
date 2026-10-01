import { Link } from '@tanstack/react-router'
import { useStyles } from '@toned/react'
import sheetSource from '../../styles/lab.ts?raw'
import { docsStyles, experimentStyles } from '../../styles/site.ts'
import { CodeBlock } from '../CodeBlock.tsx'
import { ContractDemo } from './ContractDemo.tsx'
import contractSource from './ContractDemo.tsx?raw'
import { DocumentDemo } from './DocumentDemo.tsx'
import documentSource from './DocumentDemo.tsx?raw'
import { InspectorDemo } from './InspectorDemo.tsx'
import inspectorSource from './inspector-session.ts?raw'
import { AdaptiveDemo, GridDemo, MotionDemo } from './LayoutDemos.tsx'
import layoutSource from './LayoutDemos.tsx?raw'
import { TokenDemo } from './TokenDemo.tsx'
import tokenSource from './TokenDemo.tsx?raw'

const demos = [
  {
    id: 'adaptive',
    label: 'Adaptive',
    title: 'Adaptive layout',
    summary:
      'Change the available width or the text scale; the component picks the layout variant that fits.',
    Demo: AdaptiveDemo,
    source: `${sheetSource}\n${layoutSource}`,
  },
  {
    id: 'motion',
    label: 'Motion',
    title: 'Motion',
    summary:
      'Springs, interruption and retained exits, driven by the host that owns the styles.',
    Demo: MotionDemo,
    source: layoutSource,
  },
  {
    id: 'core',
    label: 'Grid',
    anchor: 'grid',
    title: 'Typed grid',
    summary:
      'Rearrange typed grid areas without changing the component’s structure.',
    Demo: GridDemo,
    source: sheetSource,
  },
  {
    id: 'renderers',
    label: 'Renderers',
    title: 'Email and PDF output',
    summary:
      'One stylesheet resolved to inline HTML email styles and to a PDF style profile.',
    Demo: DocumentDemo,
    source: documentSource,
  },
  {
    id: 'tokens',
    label: 'Tokens',
    title: 'Token exchange',
    summary:
      'Resolve an alias, read the diagnostics and round-trip a DTCG token document.',
    Demo: TokenDemo,
    source: tokenSource,
  },
  {
    id: 'contracts',
    label: 'Contracts',
    title: 'Measured contracts',
    summary:
      'A contract measures the rendered element and checks it against the declaration.',
    Demo: ContractDemo,
    source: contractSource,
  },
  {
    id: 'inspector',
    label: 'Inspector',
    title: 'Source inspector',
    summary:
      'Inspect a declaration, preview an edit and apply it against the current source revision.',
    Demo: InspectorDemo,
    source: inspectorSource,
  },
]
export function Lab() {
  const d = useStyles(docsStyles)
  const s = useStyles(experimentStyles)
  return (
    <article>
      <h1 {...d.Title}>Capability lab</h1>
      <p {...d.Lead}>
        Seven working demos, each running the API it shows. The source under
        each one is the code that runs.
      </p>
      <nav {...s.Jump} aria-label="Experiments">
        {demos.map((demo, index) => (
          <a key={demo.id} href={`#${demo.anchor ?? demo.id}`} {...s.Chip}>
            {String(index + 1).padStart(2, '0')} · {demo.label}
          </a>
        ))}
      </nav>
      {demos.map(({ id, anchor, title, summary, Demo, source }, index) => (
        <section
          key={id}
          id={anchor ?? id}
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
          <div {...s.Stage} data-toc-skip>
            <Demo />
          </div>
          <div {...s.Footer}>
            <Link to="/learn/$topic" params={{ topic: id }} {...s.Link}>
              Reference →
            </Link>
          </div>
          <details {...s.Source}>
            <summary>▸ View source</summary>
            <CodeBlock title="Source">{source}</CodeBlock>
          </details>
        </section>
      ))}
    </article>
  )
}
