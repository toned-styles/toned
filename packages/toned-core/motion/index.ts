import {
  type HostOutput,
  type HostOutputDriver,
  interceptHostOutput,
} from '../stylesheet/applyStyles.ts'
import { nativeHostAdapter } from '../stylesheet/native-host.ts'
import { camelToKebab } from '../utils/css.ts'

/** Deliberately finite: colors, transforms and intrinsic sizes need other interpolators. */
export const motionProperties = [
  'opacity',
  'width',
  'height',
  'minWidth',
  'maxWidth',
  'minHeight',
  'maxHeight',
  'top',
  'right',
  'bottom',
  'left',
  'margin',
  'marginTop',
  'marginRight',
  'marginBottom',
  'marginLeft',
  'padding',
  'paddingTop',
  'paddingRight',
  'paddingBottom',
  'paddingLeft',
  'borderRadius',
  'gap',
  'rowGap',
  'columnGap',
] as const
export type MotionProperty = (typeof motionProperties)[number]
export type MotionValues = Partial<Record<MotionProperty, number>>
export type MotionTransition =
  | { type: 'timing'; duration?: number; easing?: (progress: number) => number }
  | {
      type: 'spring'
      stiffness?: number
      damping?: number
      mass?: number
      maxDuration?: number
    }
export type MotionFrameDriver = {
  now(): number
  request(callback: (time: number) => void): unknown
  cancel(handle: unknown): void
}
export type ReducedMotionSource = {
  current(): boolean
  subscribe(listener: (reduced: boolean) => void): () => void
}
export type MotionOptions = {
  properties: readonly MotionProperty[]
  transition?: MotionTransition
  enter?: MotionValues
  exit?: MotionValues
  reducedMotion?: boolean | ReducedMotionSource
  frames?: MotionFrameDriver
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
export const supportsMotionProperty = (
  property: string,
): property is MotionProperty =>
  (motionProperties as readonly string[]).includes(property)

const frames: MotionFrameDriver = {
  now: () => performance.now(),
  request: (callback) => {
    if (typeof requestAnimationFrame !== 'function')
      throw new Error(
        '[toned/motion] Provide a frame driver on hosts without requestAnimationFrame',
      )
    return requestAnimationFrame(callback)
  },
  cancel: (handle) => cancelAnimationFrame(handle as number),
}
const error = (message: string): never => {
  throw new Error(`[toned/motion] ${message}`)
}
const finite = (value: unknown, name: string): number =>
  typeof value === 'number' && Number.isFinite(value)
    ? value
    : error(`${name} must be finite`)
function numeric(value: unknown, property: string): number {
  if (typeof value === 'number') return finite(value, property)
  if (
    typeof value === 'string' &&
    /^-?(?:\d+\.?\d*|\.\d+)(?:px)?$/.test(value.trim())
  )
    return finite(Number.parseFloat(value), property)
  return error(
    `${property} requires a numeric or pixel-resolved target; received ${String(value)}`,
  )
}
function validate(options: MotionOptions): void {
  if (!options.properties.length) error('Choose at least one motion property')
  for (const property of options.properties)
    if (!supportsMotionProperty(property))
      error(`Unsupported motion property: ${property}`)
  for (const phase of [options.enter, options.exit])
    for (const [property, value] of Object.entries(phase ?? {})) {
      if (!options.properties.includes(property as MotionProperty))
        error(`${property} is not in motion properties`)
      finite(value, property)
    }
  const transition = options.transition
  if (transition?.type === 'timing') {
    if (finite(transition.duration ?? 200, 'duration') < 0)
      error('duration must be non-negative')
  } else if (transition?.type === 'spring') {
    for (const [key, value] of Object.entries({
      stiffness: transition.stiffness ?? 170,
      damping: transition.damping ?? 26,
      mass: transition.mass ?? 1,
      maxDuration: transition.maxDuration ?? 10000,
    }))
      if (finite(value, key) <= 0) error(`${key} must be positive`)
  } else if (transition) error('Unsupported transition type')
}

/**
 * Commit-only integration: call from the caller ref after Toned attaches the host.
 * Web targets may be sampled from generated CSS; native targets are resolved numeric
 * style fields. Both use Toned's existing host writer, including caller precedence.
 */
export function attachMotion(
  host: object,
  options: MotionOptions,
): MotionController {
  validate(options)
  const native = nativeHostAdapter(host)
  const clock = options.frames ?? frames
  const transition = options.transition ?? { type: 'timing', duration: 200 }
  const properties = [...new Set(options.properties)]
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
  let current: MotionValues = {}
  let target: MotionValues = {}
  let start: MotionValues = {}
  let velocity: MotionValues = {}
  let latest: HostOutput = {}
  let output: HostOutput = {}
  let started = 0
  let previous = 0
  let exiting = false
  let complete: ((result: MotionResult) => void) | undefined
  let write: (output: HostOutput) => void = () => {}
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
  const paint = () =>
    write({ ...output, style: { ...output['style'], ...current } })
  const finish = () => {
    cancelFrame()
    current = { ...target }
    velocity = {}
    // Remove temporary inline samples so generated CSS regains ownership.
    write(output)
    settlePromise('finished')
  }
  const sample = (next: HostOutput): MotionValues => {
    const values: MotionValues = {}
    if (native) {
      for (const property of properties) {
        const value = next['style']?.[property]
        if (value != null)
          values[property] = finite(value, `${property} on native`)
      }
    } else {
      // Install the committed target through the ownership writer before reading
      // computed CSS. The old visual value is restored in this same commit turn.
      write(next)
      const element = host as HTMLElement
      const view = element.ownerDocument?.defaultView
      const computed = view?.getComputedStyle(element)
      for (const property of properties) {
        const value =
          computed?.getPropertyValue(camelToKebab(property)) ??
          next['style']?.[property]
        if (value != null && value !== '')
          values[property] = numeric(value, property)
      }
    }
    return values
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
        if (target[property] == null) continue
        current[property] = finite(
          start[property]! * (1 - amount) + target[property]! * amount,
          `${property} interpolated value`,
        )
      }
      done = progress === 1
    } else {
      // Exact damped oscillator solution: constant bounded work per property,
      // including a frame after background suspension.
      const dt = Math.max(0, time - previous) / 1000
      const omega = Math.sqrt(
        (transition.stiffness ?? 170) / (transition.mass ?? 1),
      )
      const decay = (transition.damping ?? 26) / (2 * (transition.mass ?? 1))
      for (const property of properties) {
        if (target[property] == null) continue
        const displacement = current[property]! - target[property]!
        const speed = velocity[property] ?? 0
        let position: number
        let nextSpeed: number
        if (Math.abs(decay - omega) < 1e-7 * omega) {
          const coefficient = speed + decay * displacement
          const envelope = Math.exp(-decay * dt)
          position = (displacement + coefficient * dt) * envelope
          nextSpeed =
            (coefficient - decay * (displacement + coefficient * dt)) * envelope
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
        current[property] = target[property]! + position
        velocity[property] = nextSpeed
        if (!Number.isFinite(current[property]) || !Number.isFinite(nextSpeed))
          error('Spring parameters exceed the supported numeric range')
        if (Math.abs(position) > 0.001 || Math.abs(nextSpeed) > 0.001)
          done = false
      }
      done ||= time - started >= (transition.maxDuration ?? 10000)
    }
    previous = time
    if (done) finish()
    else {
      paint()
      request()
    }
  }
  const begin = (next: HostOutput, values: MotionValues) => {
    cancelFrame()
    output = next
    target = values
    // Absent native fields reset immediately, never interpolate to guessed zero.
    for (const property of properties) {
      if (values[property] == null) {
        delete current[property]
        delete velocity[property]
      } else current[property] ??= values[property]
    }
    start = { ...current }
    started = previous = finite(clock.now(), 'frame clock')
    if (
      reduced ||
      properties.every(
        (property) =>
          current[property] === target[property] &&
          (transition.type !== 'spring' || !velocity[property]),
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
        output = { ...next, style: { ...next['style'], ...options.exit } }
        if (scheduled) paint()
        else write(output)
        return
      }
      const values = sample(next)
      // Unrelated state writes must not restart a running transition.
      if (
        properties.every((property) => values[property] === target[property])
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
    },
  }
  const detach = interceptHostOutput(host, (initial, writer) => {
    write = writer
    latest = initial
    const values = sample(initial)
    current = { ...values, ...options.enter }
    begin(initial, values)
    return driver
  })
  try {
    if (source)
      unsubscribe = source.subscribe((value) => {
        reduced = value
        if (reduced && !disposed) finish()
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
      if (!options.exit) error('Declare exit values before requesting exit')
      settlePromise('cancelled')
      exiting = true
      const promise = new Promise<MotionResult>((resolve) => {
        complete = resolve
      })
      begin(
        { ...latest, style: { ...latest['style'], ...options.exit } },
        { ...target, ...options.exit },
      )
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
