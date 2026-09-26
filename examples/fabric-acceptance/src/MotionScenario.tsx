import { defineSystem } from '@toned/core'
import type { MotionFrameDriver, MotionOptions } from '@toned/core/motion'
import { useStyles } from '@toned/react'
import { useMotion } from '@toned/react/motion'
import * as React from 'react'
import { View, type ViewProps } from 'react-native'
import { type ScenarioProps, until, useScenario } from './Harness.tsx'

const sheet = defineSystem({}).stylesheet({
  Root: {
    $style: { width: 80, height: 20, opacity: 0.4 },
    ':hover': { $style: { width: 160, opacity: 1, minHeight: 64 } },
  },
})

export function MotionScenario({ finish }: ScenarioProps) {
  const [present, setPresent] = React.useState(true)
  const host = React.useRef<View | null>(null)
  const commits = React.useRef(0)
  const [driver] = React.useState(() => {
    let now = 0
    let sequence = 0
    let reduced = false
    const frames = new Map<number, (time: number) => void>()
    const listeners = new Set<(value: boolean) => void>()
    const clock: MotionFrameDriver = {
      now: () => now,
      request(callback) {
        frames.set(++sequence, callback)
        return sequence
      },
      cancel(handle) {
        frames.delete(handle as number)
      },
    }
    const options: MotionOptions = {
      properties: ['width', 'opacity', 'minHeight'],
      frames: clock,
      transition: { type: 'timing', duration: 100 },
      enter: { width: 40, opacity: 0 },
      exit: { width: 0, opacity: 0 },
      reducedMotion: {
        current: () => reduced,
        subscribe(listener) {
          listeners.add(listener)
          return () => {
            listeners.delete(listener)
          }
        },
      },
    }
    return {
      options,
      step(time: number) {
        now = time
        const pending = [...frames.values()]
        frames.clear()
        for (const callback of pending) callback(time)
      },
      reduce(value: boolean) {
        reduced = value
        for (const listener of listeners) listener(value)
      },
      pending: () => frames.size,
      subscriptions: () => listeners.size,
    }
  })
  const motion = useMotion(driver.options)
  const bag = useStyles(sheet).Root
  const binding = React.useRef(bag)
  React.useLayoutEffect(() => {
    binding.current = bag
    commits.current++
  }, [bag])
  const capture = React.useCallback(
    (node: View | null) => {
      host.current = node
      motion.ref(node)
    },
    [motion.ref],
  )
  useScenario(
    'portable motion uses the coordinated Fabric writer',
    finish,
    async (c) => {
      await c.appearance(
        'entry values reach the native host',
        () => host.current,
        { width: 40, alpha: 0 },
      )
      const original = host.current
      const before = commits.current
      driver.step(100)
      await c.appearance(
        'entry settles at declared native values',
        () => host.current,
        { width: 80, alpha: 0.4 },
      )
      binding.current.onHoverIn?.({})
      driver.step(150)
      await c.appearance(
        'native transition reaches midpoint',
        () => host.current,
        { width: 120, height: 64, alpha: 0.7 },
      )
      binding.current.onHoverOut?.({})
      driver.step(200)
      await c.appearance(
        'interruption keeps position and removed native field resets',
        () => host.current,
        { width: 100, height: 20, alpha: 0.55 },
      )
      driver.reduce(true)
      await c.appearance(
        'reduced motion settles the live native host',
        () => host.current,
        { width: 80, alpha: 0.4 },
      )
      c.check(
        'native animation frames require no React commits',
        commits.current,
        before,
        'render.lifecycle',
      )
      c.check(
        'native animation preserves host identity',
        host.current === original,
        true,
        'host.identity',
      )
      driver.reduce(false)
      const exit = motion.exit()
      driver.step(300)
      c.check(
        'retained exit completes',
        await exit,
        'finished',
        'render.lifecycle',
      )
      await c.appearance(
        'exit reaches native target before removal',
        () => host.current,
        { width: 0, alpha: 0 },
      )
      setPresent(false)
      await until('motion host removal', () => host.current === null)
      await Promise.resolve()
      c.check(
        'removed motion host has no scheduled work',
        driver.pending(),
        0,
        'render.lifecycle',
      )
      c.check(
        'removed motion host has no preference subscription',
        driver.subscriptions(),
        0,
        'render.lifecycle',
      )
    },
  )
  return present ? (
    <View
      {...(bag.withProps({ ref: capture }) as ViewProps)}
      collapsable={false}
      testID="acceptance-motion"
    />
  ) : null
}
