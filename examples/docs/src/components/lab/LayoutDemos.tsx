import { createAdaptiveStore } from '@toned/core/adaptive'
import { observeAdaptiveContainer } from '@toned/core/adaptive/web'
import { createElements, useStyles } from '@toned/react'
import { useAdaptiveVariants } from '@toned/react/adaptive'
import { useMotion } from '@toned/react/motion'
import { useEffect, useMemo, useRef, useState } from 'react'
import {
  adaptiveLayout,
  adaptiveStyles,
  gridStyles,
  motionStyles,
} from '../../styles/lab.ts'
import { libraryStyles } from '../../styles/library.ts'
import { ShowcaseProvider } from '../ShowcaseProvider.tsx'

const Adaptive = createElements(adaptiveStyles)
const Motion = createElements(motionStyles)
const Grid = createElements(gridStyles)
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
function AnimatedShape({
  reduced,
  expanded,
  onExited,
}: {
  reduced: boolean
  expanded: boolean
  onExited: () => void
}) {
  const options = useMemo(
    () => ({
      properties: ['width', 'borderRadius', 'opacity'] as const,
      transition: { type: 'spring' as const, stiffness: 170, damping: 26 },
      enter: { opacity: 0 },
      exit: { opacity: 0 },
      reducedMotion: reduced,
    }),
    [reduced],
  )
  const motion = useMotion(options)
  const [exiting, setExiting] = useState(false)
  return (
    <>
      <Motion expanded={expanded}>
        <Motion.Root ref={motion.ref} aria-label="Animated violet shape" />
      </Motion>
      <button
        type="button"
        disabled={exiting}
        onClick={async () => {
          setExiting(true)
          if ((await motion.exit()) === 'finished') onExited()
        }}
      >
        Play exit
      </button>
    </>
  )
}
export function MotionDemo() {
  const s = useStyles(libraryStyles)
  const [expanded, setExpanded] = useState(false)
  const [present, setPresent] = useState(true)
  const [reduced, setReduced] = useState(false)
  const [systemReduced, setSystemReduced] = useState(true)
  useEffect(() => {
    const preference = window.matchMedia('(prefers-reduced-motion: reduce)')
    const update = () => setSystemReduced(preference.matches)
    update()
    preference.addEventListener('change', update)
    return () => preference.removeEventListener('change', update)
  }, [])
  return (
    <div {...s.stack}>
      <div {...s.row}>
        <button
          {...s.input}
          type="button"
          onClick={() => setExpanded((value) => !value)}
        >
          {expanded ? 'Contract' : 'Expand'} the spring
        </button>
        <label>
          <input
            type="checkbox"
            checked={reduced}
            onChange={(event) => setReduced(event.target.checked)}
          />{' '}
          Reduce motion
        </label>
      </div>
      <ShowcaseProvider>
        {present ? (
          <AnimatedShape
            reduced={reduced || systemReduced}
            expanded={expanded}
            onExited={() => setPresent(false)}
          />
        ) : (
          <button type="button" onClick={() => setPresent(true)}>
            Play entrance
          </button>
        )}
      </ShowcaseProvider>
      <p {...s.muted}>
        Reverse the spring while it moves. Position and velocity survive
        interruption. Exit retains the host until completion. Your operating
        system’s reduced-motion preference is always respected.
      </p>
    </div>
  )
}
export function GridDemo() {
  const s = useStyles(libraryStyles)
  const [stacked, setStacked] = useState(false)
  return (
    <div {...s.stack}>
      <label>
        <input
          type="checkbox"
          checked={stacked}
          onChange={(event) => setStacked(event.target.checked)}
        />{' '}
        Stack named areas
      </label>
      <ShowcaseProvider>
        <Grid stacked={stacked}>
          <Grid.Root>
            <Grid.Avatar>T</Grid.Avatar>
            <Grid.Title>Named parts. Named places.</Grid.Title>
            <Grid.Body>
              The same avatar, title and body move between two typed grid
              layouts. No markup rewrite.
            </Grid.Body>
          </Grid.Root>
        </Grid>
      </ShowcaseProvider>
      <p {...s.muted}>
        This is the actual defineGrid API with shared area ownership. Grid is
        web-only; adaptive stack, row and wrap layouts provide the portable
        alternative.
      </p>
    </div>
  )
}
