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
    title: 'A layout that listens.',
    summary:
      'Change the available space. Scale the text. Watch the same component choose a better fit.',
    Demo: AdaptiveDemo,
    source: `${sheetSource}\n${layoutSource}`,
  },
  {
    id: 'motion',
    label: 'Motion',
    title: 'Feel the change.',
    summary:
      'Real springs, interruption and retained exits. Controlled by the same host that owns your styles.',
    Demo: MotionDemo,
    source: layoutSource,
  },
  {
    id: 'core',
    label: 'Grid',
    anchor: 'grid',
    title: 'Give every part a place.',
    summary:
      'Rearrange typed areas while keeping the component’s structure intact.',
    Demo: GridDemo,
    source: sheetSource,
  },
  {
    id: 'renderers',
    label: 'Renderers',
    title: 'Beyond the browser.',
    summary:
      'One stylesheet. Concrete output for HTML email and a deliberate PDF profile.',
    Demo: DocumentDemo,
    source: documentSource,
  },
  {
    id: 'tokens',
    label: 'Tokens',
    title: 'Let your tokens travel.',
    summary:
      'Resolve a real alias, inspect diagnostics and round-trip your authored token document.',
    Demo: TokenDemo,
    source: tokenSource,
  },
  {
    id: 'contracts',
    label: 'Contracts',
    title: 'Measure the promise.',
    summary:
      'A declaration is an intention. A measured contract checks what actually rendered.',
    Demo: ContractDemo,
    source: contractSource,
  },
  {
    id: 'inspector',
    label: 'Inspector',
    title: 'From pixels to source.',
    summary:
      'Inspect a declaration, preview a precise edit and apply it against the current source revision.',
    Demo: InspectorDemo,
    source: inspectorSource,
  },
]
export function Lab() {
  const d = useStyles(docsStyles)
  const s = useStyles(experimentStyles)
  return (
    <article>
      <h1 {...d.Title}>Don’t just read it. Try it.</h1>
      <p {...d.Lead}>
        Seven working experiments, powered by the APIs they demonstrate. Open
        the exact implementation, then take the idea into your own system.
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
              Read the complete guide →
            </Link>
          </div>
          <details {...s.Source}>
            <summary>▸ View this experiment’s actual source</summary>
            <CodeBlock title="Source">{source}</CodeBlock>
          </details>
        </section>
      ))}
    </article>
  )
}
