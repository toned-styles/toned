import { useStyles } from '@toned/react'
import { useState } from 'react'

import { experimentStyles } from '../../styles/site.ts'
import { CodeBlock } from '../CodeBlock.tsx'

/** One layer of an example: the text of the module that runs. */
export interface LayerFile {
  /** The layer this file belongs to, e.g. "Styles". */
  layer: string
  file: string
  source: string
  /** The language, when the file name and content do not settle it. */
  lang?: string
}

function Tab({
  selected,
  ...props
}: React.ComponentProps<'button'> & { selected: boolean }) {
  const s = useStyles(experimentStyles, { selected })
  return (
    <button
      {...s.Tab.withProps<'button'>({
        ...props,
        type: 'button',
        role: 'tab',
        'aria-selected': selected,
        tabIndex: selected ? 0 : -1,
      })}
    />
  )
}

/** Source by layer: one tab per file, the first selected. */
export function LayerSource({
  id,
  label,
  files,
  quiet,
  maxHeight = 420,
}: {
  id: string
  label: string
  files: LayerFile[]
  /** Tones the frame down for configuration that supports the main example. */
  quiet?: boolean
  maxHeight?: number
}) {
  const s = useStyles(experimentStyles, { quiet })
  const [index, setIndex] = useState(0)
  const current = files[index] ?? files[0]
  if (!current) return null
  const select = (next: number) => {
    const wrapped = (next + files.length) % files.length
    setIndex(wrapped)
    document.getElementById(`${id}-tab-${wrapped}`)?.focus()
  }
  return (
    <div {...s.Source}>
      <div
        tabIndex={0}
        {...s.Tabs}
        role="tablist"
        aria-label={label}
        onKeyDown={(event) => {
          if (event.key === 'ArrowRight') select(index + 1)
          if (event.key === 'ArrowLeft') select(index - 1)
        }}
      >
        {files.map(({ layer, file }, position) => (
          <Tab
            key={`${layer}:${file}`}
            id={`${id}-tab-${position}`}
            aria-controls={`${id}-panel`}
            selected={position === index}
            onClick={() => setIndex(position)}
          >
            {layer}
          </Tab>
        ))}
      </div>
      <div
        id={`${id}-panel`}
        role="tabpanel"
        aria-labelledby={`${id}-tab-${index}`}
      >
        <CodeBlock
          bare
          title={current.file}
          lang={current.lang}
          maxHeight={maxHeight}
        >
          {current.source}
        </CodeBlock>
      </div>
    </div>
  )
}
