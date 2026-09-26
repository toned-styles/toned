// @vitest-environment happy-dom
import { act, cleanup, fireEvent, render } from '@testing-library/react'
import { defineSystem, getConfig, setConfig } from '@toned/core'
import type { MotionFrameDriver, MotionOptions } from '@toned/core/motion'
import { useState } from 'react'
import { afterEach, expect, test } from 'vitest'
import { createElements } from './index.ts'
import { useMotion } from './motion.tsx'
import web from './react-web.ts'

const original = { ...getConfig() }
afterEach(() => {
  cleanup()
  setConfig(original)
})

test('committed part ref enters and retains its host until exit completes', async () => {
  setConfig({
    ...web,
    getTokens: () => ({}),
    useClassName: false,
    mediaMode: false,
    pseudoMode: 'runtime',
  })
  let time = 0
  let callback: ((time: number) => void) | undefined
  const frames: MotionFrameDriver = {
    now: () => time,
    request(next) {
      callback = next
      return 1
    },
    cancel() {
      callback = undefined
    },
  }
  const options: MotionOptions = {
    properties: ['opacity'],
    enter: { opacity: 0 },
    exit: { opacity: 0 },
    transition: { type: 'timing', duration: 100 },
    frames,
  }
  const S = createElements(
    defineSystem({}).stylesheet({
      Root: { $kind: 'view', $style: { opacity: 1 } },
    }),
  )
  function App() {
    const [present, setPresent] = useState(true)
    const motion = useMotion(options)
    return present ? (
      <S.Root ref={motion.ref} data-testid="panel">
        <button
          type="button"
          onClick={async () => {
            if ((await motion.exit()) === 'finished') setPresent(false)
          }}
        >
          Close
        </button>
      </S.Root>
    ) : (
      <span>Gone</span>
    )
  }
  const view = render(<App />)
  const step = (next: number) => {
    time = next
    const run = callback
    callback = undefined
    act(() => run?.(next))
  }
  expect(view.getByTestId('panel').style.opacity).toBe('0')
  step(100)
  expect(view.getByTestId('panel').style.opacity).toBe('1')
  fireEvent.click(view.getByText('Close'))
  step(150)
  expect(view.getByTestId('panel').style.opacity).toBe('0.5')
  await act(async () => {
    step(200)
    await Promise.resolve()
  })
  expect(view.queryByTestId('panel')).toBe(null)
  expect(view.getByText('Gone')).toBeTruthy()
  expect(callback).toBeUndefined()
})

test('same-host React ref handoff retains motion and does not replay entry', () => {
  setConfig({
    ...web,
    getTokens: () => ({}),
    useClassName: false,
    mediaMode: false,
    pseudoMode: 'runtime',
  })
  let time = 0
  let callback: ((time: number) => void) | undefined
  const frames: MotionFrameDriver = {
    now: () => time,
    request(next) {
      callback = next
      return 1
    },
    cancel() {
      callback = undefined
    },
  }
  const options: MotionOptions = {
    properties: ['opacity'],
    enter: { opacity: 0 },
    transition: { type: 'timing', duration: 100 },
    frames,
  }
  const S = createElements(
    defineSystem({}).stylesheet({
      Root: { $kind: 'view', $style: { opacity: 1 } },
    }),
  )
  function App({ label }: { label: string }) {
    const motion = useMotion(options)
    return (
      <S.Root ref={motion.ref} data-testid="panel">
        {label}
      </S.Root>
    )
  }
  const view = render(<App label="First" />)
  time = 100
  act(() => callback?.(time))
  expect(view.getByTestId('panel').style.opacity).toBe('1')
  const host = view.getByTestId('panel')
  view.rerender(<App label="Second" />)
  expect(view.getByTestId('panel')).toBe(host)
  expect(host.style.opacity).toBe('1')
})
