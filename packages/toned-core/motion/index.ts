import {
  type HostOutput,
  type HostOutputDriver,
  interceptHostOutput,
} from '../stylesheet/applyStyles.ts'
import { nativeHostAdapter } from '../stylesheet/native-host.ts'
import type { TonedError } from '../types/errors.ts'
import {
  type Channels,
  type ColorMotionProperty,
  expandProperties,
  finite,
  isColor,
  type MotionProperty,
  type NumericMotionProperty,
  readNative,
  readWeb,
  type TransformMotionProperty,
  writeStyle,
} from './channels.ts'
import { frameClock, type MotionClock } from './clock.ts'
import { colorChannels, parseColor } from './color.ts'
import { declaredMotion, matches, type MotionDeclaration } from './define.ts'
import { validateOptions } from './validate.ts'

export {
  colorMotionProperties,
  numericMotionProperties,
  transformMotionProperties,
} from './channels.ts'
export type {
  ColorMotionProperty,
  MotionProperty,
  NumericMotionProperty,
  TransformMotionProperty,
} from './channels.ts'
export { createTestClock, frameClock } from './clock.ts'
export type { MotionClock, TestClock } from './clock.ts'
export { defineMotion } from './define.ts'
export type {
  MotionDeclaration,
  MotionSpec,
  MotionTargetCheck,
  ValidMotionStates,
} from './define.ts'
export { motionProperties, supportsMotionProperty } from './properties.ts'

/** A colour value: a literal, or a token style such as `ui.t({ bgColor: 'muted' })`. */
export type MotionColor = string | { readonly style: object }
export type MotionValues = Partial<
  Record<NumericMotionProperty | TransformMotionProperty, number>
> &
  Partial<Record<ColorMotionProperty, MotionColor>>
export type MotionTransition =
  | { type: 'timing'; duration?: number; easing?: (progress: number) => number }
  | {
      type: 'spring'
      stiffness?: number
      damping?: number
      mass?: number
      maxDuration?: number
    }
/** Compatible name for {@link MotionClock}: one motion's own scheduler. */
export type MotionFrameDriver = MotionClock
export type ReducedMotionSource = {
  current(): boolean
  subscribe(listener: (reduced: boolean) => void): () => void
}
/** The active states of one host, from a Weft run's open waits or any store. */
export type MotionStateSource = {
  current(): Iterable<string>
  subscribe(listener: () => void): () => void
}
type MotionOptionsBase = {
  properties: readonly MotionProperty[]
  transition?: MotionTransition
  enter?: MotionValues
  exit?: MotionValues
  reducedMotion?: boolean | ReducedMotionSource
  /** Compatible: this motion's own clock. Prefer the shared `clock` context. */
  frames?: MotionFrameDriver
}
export type MotionOptions = MotionOptionsBase & {
  /** State-keyed transitions need the system that declares the states. */
  states?: TonedError<'Declare state-keyed motion with defineMotion(system, { states }), which checks each state against the system'>
}
export type { MotionOptionsBase }
/** What a motion shares with the rest of its tree. */
export type MotionContext = {
  /** The clock every motion in the tree reads (default: the browser's frames). */
  clock?: MotionClock
  /** Where state-keyed motion reads its active states (default: the host). */
  states?: MotionStateSource
}
export type MotionResult = 'finished' | 'cancelled'
export type MotionController = {
  /** Keep the host mounted until this resolves; unmounting cancels the exit. */
  exit(): Promise<MotionResult>
  /** Finish at the latest committed target; disposal itself never writes. */
  finish(): void
  dispose(): void
  readonly running: boolean
}

const error = (message: string): never => {
  throw new Error(`[toned/motion] ${message}`)
}
const clone = (channels: Channels): Channels =>
  Object.fromEntries(
    Object.entries(channels).map(([key, list]) => [key, [...list]]),
  )
const same = (a: number[] | undefined, b: number[] | undefined) =>
  a === b ||
  (!!a && !!b && a.length === b.length && a.every((v, i) => v === b[i]))

/**
 * Commit-only integration: call from the caller ref after Toned attaches the host.
 * Web targets may be sampled from generated CSS; native targets are resolved
 * style fields. Both use Toned's existing host writer, including caller precedence.
 * Pass the tree's shared `clock` (and, for state-keyed motion, a `states`
 * source when the host does not hold its states) in `context`.
 */
export function attachMotion(
  host: object,
  options: MotionOptions | MotionDeclaration,
  context: MotionContext = {},
): MotionController {
  validateOptions(options)
  const declared = declaredMotion(options)
  if ((options as { states?: unknown }).states && !declared)
    error(
      'Declare state-keyed motion with defineMotion(system, { states }), which checks the state names',
    )
  const native = nativeHostAdapter(host)
  const clock = options.frames ?? context.clock ?? frameClock
  const base = options.transition ?? { type: 'timing', duration: 200 }
  let transition: MotionTransition = base
  const properties = expandProperties([...new Set(options.properties)])
  const source =
    typeof options.reducedMotion === 'object'
      ? options.reducedMotion
      : undefined
  let reduced = source?.current() ?? options.reducedMotion === true
  let disposed = false
  let frame: unknown
  let scheduled = false
  let generation = 0
  let unsubscribe: (() => void) | undefined
  let unsubscribeStates: (() => void) | undefined
  let current: Channels = {}
  let target: Channels = {}
  let start: Channels = {}
  let velocity: Channels = {}
  let latest: HostOutput = {}
  let output: HostOutput = {}
  let exitTarget: Channels = {}
  let started = 0
  let previous = 0
  let exiting = false
  let complete: ((result: MotionResult) => void) | undefined
  let write: (output: HostOutput) => void = () => {}

  // Active states, for state-keyed transitions: a supplied source (a Weft
  // run), the native host's semantic states, or the web selectors.
  let readFacts: (() => ReadonlySet<string>) | undefined
  let subscribeFacts: ((notify: () => void) => () => void) | undefined
  if (declared?.entries.length) {
    const names = declared.names
    if (context.states) {
      const states = context.states
      readFacts = () => new Set(states.current())
      subscribeFacts = (notify) => states.subscribe(notify)
    } else if (native) {
      const read =
        native.readState ??
        error(
          `State-keyed motion on native reads ${names.map((n) => `':${n}'`).join(', ')}: pass a states source, or give the native host readState`,
        )
      readFacts = () => new Set(names.filter((name) => read(host, name)))
      subscribeFacts = native.subscribeState ?? native.subscribeTopology
    } else {
      const element = host as Element
      readFacts = () =>
        new Set(
          names.filter((name) => element.matches(declared.selectors[name]!)),
        )
      const Observer = element.ownerDocument?.defaultView?.MutationObserver
      if (Observer)
        subscribeFacts = (notify) => {
          // Only this host's own attributes: one observer per state-keyed motion.
          const observer = new Observer(notify)
          observer.observe(element, { attributes: true })
          return () => observer.disconnect()
        }
    }
  }
  const choose = (): MotionTransition => {
    if (!readFacts || !declared) return base
    const facts = readFacts()
    let chosen = base
    for (const entry of declared.entries)
      if (matches(entry.predicate, facts)) chosen = entry.transition
    return chosen
  }

  const withMotion = (next: HostOutput, channels: Channels): HostOutput => ({
    ...next,
    style: writeStyle(next['style'], channels, !!native),
  })
  const cancelFrame = () => {
    generation++
    if (scheduled) clock.cancel(frame)
    scheduled = false
  }
  const settlePromise = (result: MotionResult) => {
    const callback = complete
    complete = undefined
    callback?.(result)
  }
  const paint = () => write(withMotion(output, current))
  const finish = () => {
    cancelFrame()
    current = clone(target)
    velocity = {}
    // Remove temporary inline samples so generated CSS regains ownership.
    write(output)
    settlePromise('finished')
  }
  const sample = (next: HostOutput): Channels => {
    if (native) return readNative(next['style'], properties)
    // Install the committed target through the ownership writer before reading
    // computed CSS. The previous visual value is restored in this same commit turn.
    write(next)
    const element = host as HTMLElement
    const computed =
      element.ownerDocument?.defaultView?.getComputedStyle(element)
    return readWeb(computed, next['style'], properties)
  }
  /** Enter and exit values as channels; web resolves colour tokens through CSS. */
  const phase = (values: MotionValues, over: HostOutput): Channels => {
    const channels: Channels = {}
    const unresolved: Record<string, string> = {}
    for (const [property, value] of Object.entries(values) as [
      MotionProperty,
      unknown,
    ][]) {
      if (!isColor(property)) {
        channels[property] = [finite(value, property)]
        continue
      }
      const text =
        typeof value === 'string'
          ? value
          : String(
              (value as { style: Record<string, unknown> }).style[property] ??
                error(`The token style for ${property} sets no ${property}`),
            )
      const color = parseColor(text)
      if (color) channels[property] = colorChannels(color)
      else if (native)
        error(
          `${property} on native must be a colour literal (hex, rgb(), hsl(), oklab() or oklch()); got ${JSON.stringify(text)}`,
        )
      else unresolved[property] = text
    }
    const keys = Object.keys(unresolved) as MotionProperty[]
    if (keys.length) {
      const resolved = sample({
        ...over,
        style: { ...over['style'], ...unresolved },
      })
      for (const property of keys)
        channels[property] =
          resolved[property] ??
          error(
            `${property}: ${JSON.stringify(unresolved[property])} did not resolve to a colour`,
          )
    }
    return channels
  }
  const request = () => {
    if (disposed || scheduled) return
    scheduled = true
    const ticket = generation
    let requesting = true
    try {
      frame = clock.request((time) => {
        if (ticket !== generation) return
        if (requesting)
          error('Frame drivers must deliver callbacks asynchronously')
        try {
          tick(time)
        } catch (cause) {
          driver.cancel()
          throw cause
        }
      })
    } catch (cause) {
      scheduled = false
      generation++
      settlePromise('cancelled')
      throw cause
    } finally {
      requesting = false
    }
  }
  const tick = (time: number) => {
    scheduled = false
    if (disposed) return
    finite(time, 'frame timestamp')
    let done = true
    if (transition.type === 'timing') {
      const duration = transition.duration ?? 200
      const progress =
        duration === 0
          ? 1
          : Math.min(1, Math.max(0, (time - started) / duration))
      const amount = finite(
        transition.easing?.(progress) ?? progress,
        'easing result',
      )
      for (const property of properties) {
        const to = target[property]
        const from = start[property]
        if (!to || !from) continue
        current[property] = to.map((value, i) =>
          finite(
            from[i]! * (1 - amount) + value * amount,
            `${property} interpolated value`,
          ),
        )
      }
      done = progress === 1
    } else {
      // Exact damped oscillator solution: constant bounded work per channel,
      // including a frame after background suspension.
      const spring = transition
      const dt = Math.max(0, time - previous) / 1000
      const omega = Math.sqrt((spring.stiffness ?? 170) / (spring.mass ?? 1))
      const decay = (spring.damping ?? 26) / (2 * (spring.mass ?? 1))
      for (const property of properties) {
        const to = target[property]
        const at = current[property]
        if (!to || !at) continue
        const speeds = velocity[property] ?? []
        const next = to.map((goal, i) => {
          const displacement = at[i]! - goal
          const speed = speeds[i] ?? 0
          let position: number
          let nextSpeed: number
          if (Math.abs(decay - omega) < 1e-7 * omega) {
            const coefficient = speed + decay * displacement
            const envelope = Math.exp(-decay * dt)
            position = (displacement + coefficient * dt) * envelope
            nextSpeed =
              (coefficient - decay * (displacement + coefficient * dt)) *
              envelope
          } else if (decay < omega) {
            const frequency = Math.sqrt(omega * omega - decay * decay)
            const sine = Math.sin(frequency * dt)
            const cosine = Math.cos(frequency * dt)
            const coefficient = (speed + decay * displacement) / frequency
            const envelope = Math.exp(-decay * dt)
            position = envelope * (displacement * cosine + coefficient * sine)
            nextSpeed =
              envelope *
              ((coefficient * frequency - decay * displacement) * cosine -
                (displacement * frequency + decay * coefficient) * sine)
          } else {
            const root = Math.sqrt(decay * decay - omega * omega)
            const slow = (-omega * omega) / (decay + root)
            const fast = -decay - root
            const coefficient = (speed - fast * displacement) / (slow - fast)
            const a = coefficient * Math.exp(slow * dt)
            const b = (displacement - coefficient) * Math.exp(fast * dt)
            position = a + b
            nextSpeed = slow * a + fast * b
          }
          if (!Number.isFinite(goal + position) || !Number.isFinite(nextSpeed))
            error('Spring parameters exceed the supported numeric range')
          if (Math.abs(position) > 0.001 || Math.abs(nextSpeed) > 0.001)
            done = false
          return [goal + position, nextSpeed] as const
        })
        current[property] = next.map(([position]) => position)
        velocity[property] = next.map(([, speed]) => speed)
      }
      done ||= time - started >= (spring.maxDuration ?? 10000)
    }
    previous = time
    if (done) finish()
    else {
      paint()
      request()
    }
  }
  const begin = (next: HostOutput, values: Channels) => {
    cancelFrame()
    output = next
    target = values
    transition = choose()
    // Absent native fields reset immediately, never interpolate to guessed zero.
    for (const property of properties) {
      if (values[property] == null) {
        delete current[property]
        delete velocity[property]
      } else current[property] ??= [...values[property]!]
    }
    start = clone(current)
    started = previous = finite(clock.now(), 'frame clock')
    if (
      reduced ||
      properties.every(
        (property) =>
          same(current[property], target[property]) &&
          (transition.type !== 'spring' ||
            !velocity[property]?.some((speed) => speed !== 0)),
      )
    )
      finish()
    else {
      paint()
      request()
    }
  }
  const driver: HostOutputDriver = {
    update(next) {
      if (disposed) return
      latest = next
      if (exiting) {
        // Continue applying non-motion props while retaining the exit target.
        output = withMotion(next, exitTarget)
        if (scheduled) paint()
        else write(output)
        return
      }
      const values = sample(next)
      // Unrelated state writes must not restart a running transition.
      if (
        properties.every((property) => same(values[property], target[property]))
      ) {
        output = next
        if (scheduled) paint()
        else write(next)
        return
      }
      begin(next, values)
    },
    cancel() {
      cancelFrame()
      exiting = false
      settlePromise('cancelled')
    },
    dispose() {
      if (disposed) return
      disposed = true
      driver.cancel()
      unsubscribe?.()
      unsubscribeStates?.()
    },
  }
  const detach = interceptHostOutput(host, (initial, writer) => {
    write = writer
    latest = initial
    const values = sample(initial)
    current = { ...values, ...phase(options.enter ?? {}, initial) }
    begin(initial, values)
    return driver
  })
  try {
    if (source)
      unsubscribe = source.subscribe((value) => {
        reduced = value
        if (reduced && !disposed) finish()
      })
    // A state change that writes no Toned output still resamples the target.
    unsubscribeStates = subscribeFacts?.(() => {
      if (!disposed && !exiting) driver.update(latest)
    })
  } catch (cause) {
    detach()
    throw cause
  }
  return {
    get running() {
      return scheduled
    },
    exit() {
      if (disposed) return Promise.resolve('cancelled')
      const exit =
        options.exit ?? error('Declare exit values before requesting exit')
      settlePromise('cancelled')
      const values = phase(exit, latest)
      exiting = true
      exitTarget = { ...target, ...values }
      const promise = new Promise<MotionResult>((resolve) => {
        complete = resolve
      })
      begin(withMotion(latest, exitTarget), exitTarget)
      return promise
    },
    finish() {
      if (!disposed) finish()
    },
    dispose: detach,
  }
}

/** Opt-in reduced-motion source; created at commit time, never on module import. */
export function webReducedMotion(
  view: Pick<Window, 'matchMedia'> = window,
): ReducedMotionSource {
  const query = view.matchMedia('(prefers-reduced-motion: reduce)')
  return {
    current: () => query.matches,
    subscribe(listener) {
      const update = () => listener(query.matches)
      query.addEventListener('change', update)
      return () => query.removeEventListener('change', update)
    },
  }
}
