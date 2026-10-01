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

/** One component followed from tokens to output, beside the live result. */
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
            Tokens in, components out
          </h2>
          <p {...s.Body}>
            Follow one small component from design tokens to the screen. This is
            the code the page runs: change the variant and the result follows.
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
            <Step number={1} title="Define your tokens">
              <p {...s.StepBody}>
                A token is a design decision with a name: which tints exist,
                which shapes, which text styles. Together they are the
                vocabulary your components are written in.
              </p>
              <CodeBlock title="system.ts" lang="ts" maxHeight={380}>
                {systemSource}
              </CodeBlock>
            </Step>

            <Step number={2} title="Style the parts">
              <p {...s.StepBody}>
                Name the component’s parts and give each one token values.
                Variants sit beside them: a tone changes the root and the badge
                together.
              </p>
              <CodeBlock title="styles.ts" lang="ts" maxHeight={380}>
                {stylesSource}
              </CodeBlock>
              <p {...s.StepBody}>
                Your editor completes the values, and a typo does not compile:
              </p>
              <figure {...s.Diagnostic} aria-label="A type error">
                <pre
                  {...s.DiagnosticCode}
                  // oxlint-disable-next-line jsx-a11y/no-noninteractive-tabindex -- keyboard users must be able to scroll wide code.
                  tabIndex={0}
                >
                  {'Root: { tint: '}
                  <span {...s.DiagnosticMark}>{"'sucess'"}</span>
                  {", shape: 'card', stack: 8 },"}
                </pre>
                <figcaption {...s.DiagnosticMessage}>
                  error TS2820: Type '"sucess"' is not assignable to type
                  '"danger" | "success" | "info" | undefined'. Did you mean
                  '"success"'?
                </figcaption>
              </figure>
            </Step>

            <Step number={3} title="Use it in a component">
              <p {...s.StepBody}>
                <InlineCode>createElements</InlineCode> binds the parts to
                elements. The component passes the variants as props and holds
                no class names or style logic.
              </p>
              <CodeBlock title="Notice.tsx" lang="tsx" maxHeight={380}>
                {componentSource}
              </CodeBlock>
            </Step>

            <Step number="→" title="What comes out">
              <p {...s.StepBody}>
                On the web the CSS is built ahead of time and each part gets
                class names. The same stylesheet also resolves to inline styles
                for HTML email. These are the root’s props for the variant you
                picked.
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
