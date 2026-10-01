import { Link } from '@tanstack/react-router'
import { TonedProvider, useStyles } from '@toned/react'
import { webHost } from '@toned/react/hosts/web'
import { type ReactNode, useState } from 'react'
import { homeStyles } from '../../styles/home.ts'
import { ChoiceButton } from '../ChoiceButton.tsx'
import { CodeBlock, InlineCode } from '../CodeBlock.tsx'
import { noticeEmailProps } from './story/email.ts'
import emailSource from './story/email.ts?raw'
import { Notice } from './story/Notice.tsx'
import componentSource from './story/Notice.tsx?raw'
import { storyRenderer } from './story/renderer.ts'
import { noticeStyles } from './story/styles.ts'
import stylesSource from './story/styles.ts?raw'
import systemSource from './story/system.ts?raw'

type Tone = 'info' | 'success' | 'danger'
type Size = 'regular' | 'compact'

const tones = [
  {
    id: 'info',
    name: 'Info',
    label: 'Queued',
    title: 'Release 4.12 is queued',
    body: 'It starts when a runner is free.',
  },
  {
    id: 'success',
    name: 'Success',
    label: 'Live',
    title: 'Release 4.12 is live',
    body: 'All regions report the new version.',
  },
  {
    id: 'danger',
    name: 'Danger',
    label: 'Failed',
    title: 'Release 4.12 failed',
    body: 'The previous version is still serving traffic.',
  },
] as const

const sizes = [
  { id: 'regular', name: 'Regular' },
  { id: 'compact', name: 'Compact' },
] as const

function Step({
  number,
  title,
  children,
}: {
  number: number | '→'
  title: string
  children: ReactNode
}) {
  const s = useStyles(homeStyles)
  return (
    <div {...s.Step}>
      <div {...s.StepHead}>
        <span {...s.StepNumber} aria-hidden="true">
          {number}
        </span>
        <h3 {...s.StepTitle}>{title}</h3>
      </div>
      {children}
    </div>
  )
}

/** One component followed through its three files, beside the result. */
export function HowItWorks() {
  const s = useStyles(homeStyles)
  const [tone, setTone] = useState<Tone>('info')
  const [size, setSize] = useState<Size>('regular')
  const copy = tones.find((item) => item.id === tone) ?? tones[0]
  const variants = { tone, size }
  // The same sheet and variants, resolved by two renderers.
  const web = storyRenderer.resolve(noticeStyles, { variants }).Root
  const email = noticeEmailProps(variants).Root

  return (
    <TonedProvider renderer={storyRenderer} host={webHost}>
      <section {...s.Section} id="how-it-works" aria-labelledby="how-title">
        <div {...s.SectionIntro}>
          <p {...s.Eyebrow}>How it works</p>
          <h2 id="how-title" {...s.Heading}>
            One component, three files
          </h2>
          <p {...s.Body}>
            A notice with a badge, a title and a body. The three files below are
            the ones this page runs; change the variant and the result follows.
          </p>
        </div>
        <div {...s.Story}>
          <div {...s.ResultPin}>
            <section {...s.Result} aria-label="Live result">
              <p {...s.ResultLabel}>Live result</p>
              <div {...s.Stage} data-testid="story-preview">
                <div {...s.StageInner}>
                  <Notice
                    tone={tone}
                    size={size}
                    label={copy.label}
                    title={copy.title}
                  >
                    {copy.body}
                  </Notice>
                </div>
              </div>
              <div {...s.Controls}>
                <div {...s.Field} role="group" aria-labelledby="story-tone">
                  <span id="story-tone" {...s.FieldLabel}>
                    Tone
                  </span>
                  <div {...s.Choices}>
                    {tones.map((item) => (
                      <ChoiceButton
                        key={item.id}
                        selected={item.id === tone}
                        onClick={() => setTone(item.id)}
                      >
                        {item.name}
                      </ChoiceButton>
                    ))}
                  </div>
                </div>
                <div {...s.Field} role="group" aria-labelledby="story-size">
                  <span id="story-size" {...s.FieldLabel}>
                    Size
                  </span>
                  <div {...s.Choices}>
                    {sizes.map((item) => (
                      <ChoiceButton
                        key={item.id}
                        selected={item.id === size}
                        onClick={() => setSize(item.id)}
                      >
                        {item.name}
                      </ChoiceButton>
                    ))}
                  </div>
                </div>
              </div>
              <code {...s.Usage} data-testid="story-usage">
                {`<Notice tone="${tone}" size="${size}" />`}
              </code>
            </section>
          </div>

          <div {...s.Steps}>
            <Step number={1} title="The system: tokens">
              <p {...s.StepBody}>
                A system defines the tokens a product uses. Each token lists its
                allowed values and what they resolve to. These are the only
                values a stylesheet can use.
              </p>
              <CodeBlock title="system.ts" lang="ts" maxHeight={380}>
                {systemSource}
              </CodeBlock>
            </Step>

            <Step number={2} title="The stylesheet: parts and variants">
              <p {...s.StepBody}>
                The stylesheet names the component’s parts and gives each one
                token values. Variants are declared here too: one tone changes
                the root and the badge together.
              </p>
              <CodeBlock title="styles.ts" lang="ts" maxHeight={380}>
                {stylesSource}
              </CodeBlock>
              <p {...s.StepBody}>
                The values are typed. A value the token does not list is a
                compile error:
              </p>
              <figure {...s.Diagnostic} aria-label="A type error">
                <pre
                  {...s.DiagnosticCode}
                  // biome-ignore lint/a11y/noNoninteractiveTabindex: keyboard users must be able to scroll wide code.
                  tabIndex={0}
                >
                  {'Root: { surface: '}
                  <span {...s.DiagnosticMark}>{"'sucess'"}</span>
                  {' },'}
                </pre>
                <figcaption {...s.DiagnosticMessage}>
                  error TS2820: Type '"sucess"' is not assignable to type
                  '"danger" | "success" | "info" | "info-solid" |
                  "success-solid" | "danger-solid" | undefined'. Did you mean
                  '"success"'?
                </figcaption>
              </figure>
            </Step>

            <Step number={3} title="The component">
              <p {...s.StepBody}>
                <InlineCode>createElements</InlineCode> binds the parts to
                elements. The component passes the variant values and holds no
                class names or style logic.
              </p>
              <CodeBlock title="Notice.tsx" lang="tsx" maxHeight={380}>
                {componentSource}
              </CodeBlock>
            </Step>

            <Step number="→" title="What comes out">
              <p {...s.StepBody}>
                For the web, the CSS is generated at build time and the parts
                receive class names; nothing is injected at render. The core
                needs no framework, so the same sheet also resolves to inline
                styles for HTML email. These are the root part’s props for the
                selected variant.
              </p>
              <CodeBlock title="email.ts" lang="ts">
                {emailSource}
              </CodeBlock>
              <div {...s.Outputs}>
                <div {...s.Output} data-output="web">
                  <CodeBlock
                    title="Web: class names"
                    lang="json"
                    maxHeight={300}
                  >
                    {JSON.stringify(web, null, 2)}
                  </CodeBlock>
                </div>
                <div {...s.Output} data-output="email">
                  <CodeBlock
                    title="Email: inline styles"
                    lang="json"
                    maxHeight={300}
                  >
                    {JSON.stringify(email, null, 2)}
                  </CodeBlock>
                </div>
              </div>
              <Link to="/getting-started" {...s.TextLink}>
                Set this up in a project
              </Link>
            </Step>
          </div>
        </div>
      </section>
    </TonedProvider>
  )
}
