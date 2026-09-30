import { useStyles } from '@toned/react'
import { useState } from 'react'
import { homeStyles } from '../styles/home.ts'
import showcaseSource from '../styles/showcase.ts?raw'
import systemSource from '../styles/system.ts?raw'
import { ChoiceButton } from './ChoiceButton.tsx'
import { CodeBlock } from './CodeBlock.tsx'

export function SourcePanel() {
  const s = useStyles(homeStyles)
  const [tab, setTab] = useState<'stylesheet' | 'tokens'>('stylesheet')
  const [copyMessage, setCopyMessage] = useState('')
  const source = tab === 'stylesheet' ? showcaseSource : systemSource
  async function copy() {
    try {
      await navigator.clipboard.writeText(source)
      setCopyMessage('Copied')
    } catch {
      setCopyMessage('Select the code below to copy it.')
    }
  }
  return (
    <section id="source" {...s.Source} aria-label="Playground source">
      <div {...s.StudioBar}>
        <div {...s.Choices}>
          {(['stylesheet', 'tokens'] as const).map((value) => (
            <ChoiceButton
              key={value}
              selected={tab === value}
              onClick={() => {
                setTab(value)
                setCopyMessage('')
              }}
            >
              {value === 'stylesheet' ? 'Stylesheet' : 'Design tokens'}
            </ChoiceButton>
          ))}
        </div>
        <button type="button" {...s.TextLink} onClick={copy}>
          Copy source
        </button>
        <span role="status" {...s.Muted}>
          {copyMessage}
        </span>
      </div>
      <div
        {...s.SourceScroll}
        // biome-ignore lint/a11y/noNoninteractiveTabindex: keyboard users must be able to scroll the code region.
        tabIndex={0}
        role="region"
        aria-label={`${tab} source`}
      >
        <CodeBlock bare>{source}</CodeBlock>
      </div>
    </section>
  )
}
