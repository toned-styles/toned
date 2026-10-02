import { createAdaptiveStore } from '@toned/core/adaptive'
import { observeAdaptiveContainer } from '@toned/core/adaptive/web'
import { createElements, useStyles } from '@toned/react'
import { useAdaptiveVariants } from '@toned/react/adaptive'
import { useEffect, useRef, useState } from 'react'

import { libraryStyles } from '../../styles/library.ts'
import { ShowcaseProvider } from '../ShowcaseProvider.tsx'
import { adaptiveLayout, adaptiveStyles } from './adaptive.styles.ts'

const Adaptive = createElements(adaptiveStyles)

function AdaptivePreview({
  width,
  textScale,
}: {
  width: number
  textScale: number
}) {
  const [store] = useState(() =>
    createAdaptiveStore(adaptiveLayout, { textScale: 1 }),
  )
  const available = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (available.current)
      return observeAdaptiveContainer(store, available.current)
  }, [store])
  useEffect(() => store.update({ textScale }), [store, textScale])
  const variants = useAdaptiveVariants(store)
  return (
    <>
      <p role="status">
        Selected layout: <strong>{variants.layout}</strong>
      </p>
      <div
        ref={available}
        style={{
          width: `${width}%`,
          minHeight: 200,
          fontSize: `${textScale}em`,
        }}
      >
        <Adaptive {...variants}>
          <Adaptive.Root>
            <Adaptive.Title>Adaptive card</Adaptive.Title>
            <Adaptive.Body>
              The layout follows this container and the text scale you choose.
            </Adaptive.Body>
            <Adaptive.Actions>Explore →</Adaptive.Actions>
          </Adaptive.Root>
        </Adaptive>
      </div>
    </>
  )
}

export function AdaptiveDemo() {
  const s = useStyles(libraryStyles)
  const [width, setWidth] = useState(100)
  const [scale, setScale] = useState(1)
  return (
    <div {...s.stack}>
      <label>
        Available width · {width}%
        <input
          aria-label="Available width"
          type="range"
          min={40}
          max={100}
          value={width}
          onChange={(event) => setWidth(Number(event.target.value))}
        />
      </label>
      <label>
        Text scale · {scale.toFixed(1)}×
        <input
          aria-label="Text scale"
          type="range"
          min={1}
          max={2}
          step={0.1}
          value={scale}
          onChange={(event) => setScale(Number(event.target.value))}
        />
      </label>
      <ShowcaseProvider>
        <AdaptivePreview width={width} textScale={scale} />
      </ShowcaseProvider>
      <p {...s.muted}>
        Real ResizeObserver measurements select the typed variant. Wide needs
        480px and text scale at most 1.5×; hysteresis prevents boundary flicker.
        On a narrow device, increase text scale to explore the stacked fallback.
      </p>
    </div>
  )
}
