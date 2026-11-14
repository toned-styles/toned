// @vitest-environment happy-dom
import { act, cleanup, fireEvent, render } from '@testing-library/react'
import { defineSystem, getConfig, setConfig } from '@toned/core'
import {
  createTestClock,
  defineMotion,
  type MotionFrameDriver,
  type MotionOptions,
} from '@toned/core/motion'
import { useState } from 'react'
import { afterEach, expect, test } from 'vitest'

import { createElements } from './index.ts'
import { MotionClockProvider, useMotion } from './motion.tsx'
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
  function App({ label }: { label: string }) {
    const [present, setPresent] = useState(true)
    const motion = useMotion(options)
    return present ? (
      // oxlint-disable-next-line react/refs -- motion.ref is a callback ref passed to the host, never read during render.
      <S.Root ref={motion.ref} data-testid="panel" aria-label={label}>
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
  const view = render(<App label="First" />)
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
  const host = view.getByTestId('panel')
  view.rerender(<App label="Closing" />)
  expect(view.getByTestId('panel')).toBe(host)
  expect(host.style.opacity).toBe('0.5')
  step(175)
  expect(host.style.opacity).toBe('0.25')
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
      // oxlint-disable-next-line react/refs -- motion.ref is a callback ref passed to the host, never read during render.
      <S.Root ref={motion.ref} data-testid="panel">
        {label}
      </S.Root>
    )
  }
  const view = render(<App label="First" />)
  time = 50
  act(() => callback?.(time))
  expect(view.getByTestId('panel').style.opacity).toBe('0.5')
  const host = view.getByTestId('panel')
  view.rerender(<App label="Second" />)
  expect(view.getByTestId('panel')).toBe(host)
  expect(host.style.opacity).toBe('0.5')
  time = 75
  act(() => callback?.(time))
  expect(host.style.opacity).toBe('0.75')
  time = 100
  act(() => callback?.(time))
  expect(host.style.opacity).toBe('1')
  view.rerender(<App label="Third" />)
  expect(host.style.opacity).toBe('1')
})

test('one clock in a provider steps every motion in the tree', () => {
  setConfig({
    ...web,
    getTokens: () => ({}),
    useClassName: false,
    mediaMode: false,
    pseudoMode: 'runtime',
  })
  const clock = createTestClock()
  const fade: MotionOptions = {
    properties: ['opacity', 'translateY'],
    enter: { opacity: 0, translateY: 10 },
    transition: { type: 'timing', duration: 100 },
  }
  const S = createElements(
    defineSystem({}).stylesheet({
      Root: { $kind: 'view', $style: { opacity: 1 } },
    }),
  )
  function Panel({ id }: { id: string }) {
    const motion = useMotion(fade)
    // oxlint-disable-next-line react/refs -- motion.ref is a callback ref passed to the host, never read during render.
    return <S.Root ref={motion.ref} data-testid={id} />
  }
  const view = render(
    <MotionClockProvider clock={clock}>
      <Panel id="a" />
      <Panel id="b" />
    </MotionClockProvider>,
  )
  expect(clock.pending).toBe(2)
  act(() => {
    clock.advance(50)
  })
  for (const id of ['a', 'b']) {
    expect(view.getByTestId(id).style.opacity).toBe('0.5')
    expect(view.getByTestId(id).style.translate).toBe('0px 5px')
  }
  act(() => {
    clock.advance(50)
  })
  expect(view.getByTestId('a').style.opacity).toBe('1')
  expect(clock.pending).toBe(0)
})

test('state-keyed motion reads a states source passed to useMotion', () => {
  setConfig({
    ...web,
    getTokens: () => ({}),
    useClassName: false,
    mediaMode: false,
    pseudoMode: 'runtime',
  })
  const clock = createTestClock()
  const ui = defineSystem({
    id: 'react-motion-states',
    tokens: {},
    conditions: { states: { saving: '[data-saving]' } },
  })
  const saving = defineMotion(ui, {
    properties: ['opacity'],
    transition: { type: 'timing', duration: 100 },
    states: { ':saving': { type: 'timing', duration: 400 } },
  })
  // A Weft run's open waits, as the binding exposes them.
  const run = {
    waits: ['saving'],
    current: () => run.waits,
    subscribe: () => () => {},
  }
  const S = createElements(
    defineSystem({}).stylesheet({ Root: { $kind: 'view' } }),
  )
  function Button({ dim }: { dim: boolean }) {
    const motion = useMotion(saving, { states: run })
    return (
      <S.Root
        // oxlint-disable-next-line react/refs -- motion.ref is a callback ref passed to the host, never read during render.
        ref={motion.ref}
        data-testid="b"
        style={{ opacity: dim ? 0.2 : 1 }}
      />
    )
  }
  const view = render(
    <MotionClockProvider clock={clock}>
      <Button dim={false} />
    </MotionClockProvider>,
  )
  view.rerender(
    <MotionClockProvider clock={clock}>
      <Button dim />
    </MotionClockProvider>,
  )
  act(() => {
    clock.advance(200)
  })
  expect(Number(view.getByTestId('b').style.opacity)).toBeCloseTo(0.6)
})
