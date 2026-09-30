import { Link } from '@tanstack/react-router'
import { useStyles } from '@toned/react'
import sheetSource from '../../styles/lab.ts?raw'
import { libraryStyles } from '../../styles/library.ts'
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
    title: 'A layout that listens.',
    summary:
      'Change the available space. Scale the text. Watch the same component choose a better fit.',
    Demo: AdaptiveDemo,
    source: `${sheetSource}\n${layoutSource}`,
  },
  {
    id: 'motion',
    title: 'Feel the change.',
    summary:
      'Real springs, interruption and retained exits. Controlled by the same host that owns your styles.',
    Demo: MotionDemo,
    source: layoutSource,
  },
  {
    id: 'core',
    anchor: 'grid',
    title: 'Give every part a place.',
    summary:
      'Rearrange typed areas while keeping the component’s structure intact.',
    Demo: GridDemo,
    source: sheetSource,
  },
  {
    id: 'renderers',
    title: 'Beyond the browser.',
    summary:
      'One stylesheet. Concrete output for HTML email and a deliberate PDF profile.',
    Demo: DocumentDemo,
    source: documentSource,
  },
  {
    id: 'tokens',
    title: 'Let your tokens travel.',
    summary:
      'Resolve a real alias, inspect diagnostics and round-trip your authored token document.',
    Demo: TokenDemo,
    source: tokenSource,
  },
  {
    id: 'contracts',
    title: 'Measure the promise.',
    summary:
      'A declaration is an intention. A measured contract checks what actually rendered.',
    Demo: ContractDemo,
    source: contractSource,
  },
  {
    id: 'inspector',
    title: 'From pixels to source.',
    summary:
      'Inspect a declaration, preview a precise edit and apply it against the current source revision.',
    Demo: InspectorDemo,
    source: inspectorSource,
  },
]
export function Lab() {
  const s = useStyles(libraryStyles)
  return (
    <article {...s.stack}>
      <p {...s.eyebrow}>The capability lab</p>
      <h1 {...s.title}>
        Don’t just read it.
        <br />
        Try it.
      </h1>
      <p {...s.intro}>
        Seven working experiments, powered by the APIs they demonstrate. Open
        the exact implementation, then take the idea into your own system.
      </p>
      <nav {...s.row} aria-label="Experiments">
        {demos.map((demo) => (
          <a key={demo.id} href={`#${demo.anchor ?? demo.id}`}>
            {demo.anchor ?? demo.id}
          </a>
        ))}
      </nav>
      {demos.map(({ id, anchor, title, summary, Demo, source }, index) => (
        <section key={id} id={anchor ?? id} {...s.panel}>
          <p {...s.eyebrow}>Experiment {String(index + 1).padStart(2, '0')}</p>
          <h2>{title}</h2>
          <p>{summary}</p>
          <Demo />
          <div {...s.row}>
            <Link to="/learn/$topic" params={{ topic: id }}>
              Read the complete guide →
            </Link>
          </div>
          <details>
            <summary>View this experiment’s actual source</summary>
            <CodeBlock>{source}</CodeBlock>
          </details>
        </section>
      ))}
      <p>
        Ready for more? <Link to="/playground">Design a component</Link>,{' '}
        <Link to="/ui">edit the UI collection</Link>, or{' '}
        <Link to="/explore">explore every capability</Link>.
      </p>
    </article>
  )
}
