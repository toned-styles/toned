import { createElements, useStyles } from '@toned/react'
import { useMotion } from '@toned/react/motion'
import { useEffect, useMemo, useState } from 'react'
import { libraryStyles } from '../../styles/library.ts'
import { ShowcaseProvider } from '../ShowcaseProvider.tsx'
import { motionStyles } from './motion.styles.ts'

const Motion = createElements(motionStyles)

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
