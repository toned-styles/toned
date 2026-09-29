import { createElements, useStyles } from '@toned/react'
import { useState } from 'react'
import { homeStyles } from '../styles/home.ts'
import { showcaseStyles } from '../styles/showcase.ts'

import { ChoiceButton } from './ChoiceButton.tsx'

const S = createElements(showcaseStyles)

function ChoiceGroup<T extends string>({
  label,
  values,
  value,
  onChange,
}: {
  label: string
  values: readonly T[]
  value: T
  onChange: (value: T) => void
}) {
  const s = useStyles(homeStyles)
  return (
    <fieldset {...s.Field}>
      <legend {...s.Label}>{label}</legend>
      <div {...s.Choices}>
        {values.map((option) => (
          <ChoiceButton
            key={option}
            selected={value === option}
            onClick={() => onChange(option)}
          >
            {option.charAt(0).toUpperCase() + option.slice(1)}
          </ChoiceButton>
        ))}
      </div>
    </fieldset>
  )
}

function PreviewCard() {
  const [saved, setSaved] = useState(false)
  return (
    <S.Root as="div">
      <S.Card as="div" className="tnd-studio-card">
        <S.Row as="div">
          <S.Icon as="div" aria-hidden="true">
            <svg
              aria-hidden="true"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
            >
              <path d="m12 3 9 5-9 5-9-5 9-5Z M3 12l9 5 9-5 M3 16l9 5 9-5" />
            </svg>
          </S.Icon>
          <S.Badge as="span">In the making</S.Badge>
        </S.Row>
        <S.Stack as="div">
          <S.Heading as="h3">
            Something good
            <br />
            is taking shape.
          </S.Heading>
          <S.Caption as="p">Your next idea, with a style of its own.</S.Caption>
        </S.Stack>
        <S.Stack as="div">
          <S.Row as="div">
            <S.Caption as="span">Design exploration</S.Caption>
            <S.Caption as="span">72%</S.Caption>
          </S.Row>
          <S.Progress
            as="div"
            role="progressbar"
            aria-label="Design exploration"
            aria-valuenow={72}
            aria-valuemin={0}
            aria-valuemax={100}
          >
            <S.Fill as="div" />
          </S.Progress>
        </S.Stack>
        <S.Button
          as="button"
          type="button"
          aria-pressed={saved}
          onClick={() => setSaved(!saved)}
        >
          {saved ? 'Idea saved ✓' : 'Save this idea'}
        </S.Button>
      </S.Card>
    </S.Root>
  )
}

export function StyleStudio() {
  const s = useStyles(homeStyles)
  const [tone, setTone] = useState<'blue' | 'violet' | 'coral'>('blue')
  const [shape, setShape] = useState<'rounded' | 'sharp'>('rounded')
  const [density, setDensity] = useState<'comfortable' | 'compact'>(
    'comfortable',
  )
  const [theme, setTheme] = useState<'light' | 'dark'>('light')
  return (
    <section id="studio" aria-labelledby="studio-title" {...s.Studio}>
      <div {...s.StudioBar}>
        <h2 id="studio-title">The style studio</h2>
        <button
          type="button"
          {...s.TextLink}
          onClick={() => {
            setTone('blue')
            setShape('rounded')
            setDensity('comfortable')
            setTheme('light')
          }}
        >
          Reset styles
        </button>
      </div>
      <div {...s.StudioGrid}>
        <div {...s.Preview}>
          <S tone={tone} shape={shape} density={density} theme={theme}>
            <PreviewCard />
          </S>
        </div>
        <div {...s.Controls}>
          <ChoiceGroup
            label="Tone"
            values={['blue', 'violet', 'coral']}
            value={tone}
            onChange={setTone}
          />
          <ChoiceGroup
            label="Shape"
            values={['rounded', 'sharp']}
            value={shape}
            onChange={setShape}
          />
          <ChoiceGroup
            label="Density"
            values={['comfortable', 'compact']}
            value={density}
            onChange={setDensity}
          />
          <ChoiceGroup
            label="Theme"
            values={['light', 'dark']}
            value={theme}
            onChange={setTheme}
          />
          <pre
            {...s.Selection}
            role="region"
            aria-label="Current variant selection"
          >
            <code>{`<S tone="${tone}" shape="${shape}"\n   density="${density}" theme="${theme}">\n  <PreviewCard />\n</S>`}</code>
          </pre>
        </div>
      </div>
      <div {...s.StudioFooter}>
        <span>One stylesheet. Named parts. Typed variants.</span>
        <a href="#source">See the stylesheet</a>
      </div>
    </section>
  )
}
