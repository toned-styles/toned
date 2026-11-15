/**
 * Plays a system animation's keyframes on a native host: the same host
 * output interception, channels, clock and reduced-motion source as
 * transitions (index.ts), so writes still go through Toned's writer and
 * caller-owned values still win. Frames run on the JS thread.
 *
 * CSS semantics are followed where native can follow them: the timing
 * function applies per keyframe segment, a reversed iteration reverses it,
 * a property a keyframe leaves out takes the committed value at the ends,
 * and the fill mode decides what shows before the delay and after the end.
 * Colours interpolate in premultiplied Oklab, as transitions do.
 */
import {
  type HostOutput,
  interceptHostOutput,
} from '../stylesheet/applyStyles.ts'
import { nativeHostAdapter } from '../stylesheet/native-host.ts'
import {
  type NativeAnimation,
  nativeFrameStyle,
  reducedMotionFrame,
} from '../system/animations.ts'
import type { AnimationDefinition } from '../types/tokens.ts'
import {
  type Channels,
  finite,
  isColor,
  type MotionProperty,
  readNative,
  writeStyle,
} from './channels.ts'
import { frameClock, type MotionClock } from './clock.ts'
import { colorChannels, parseColor } from './color.ts'
import type { ReducedMotionSource } from './index.ts'
import { supportsMotionProperty } from './properties.ts'

const error = (message: string): never => {
  throw new Error(`[toned/motion] ${message}`)
}

export type AnimationController = {
  dispose(): void
  /** Whether a frame is scheduled: false at rest and under reduced motion. */
  readonly running: boolean
}

type Point = { offset: number; channels: number[] }

/** A cubic Bézier timing curve, solved for x by Newton's method then bisection. */
function cubicBezier(x1: number, y1: number, x2: number, y2: number) {
  const curve = (a: number, b: number) => (t: number) =>
    3 * a * t * (1 - t) ** 2 + 3 * b * t * t * (1 - t) + t ** 3
  const x = curve(x1, x2)
  const y = curve(y1, y2)
  const dx = (t: number) =>
    3 * x1 * (1 - t) ** 2 + 6 * (x2 - x1) * t * (1 - t) + 3 * (1 - x2) * t * t
  return (progress: number) => {
    if (progress <= 0 || progress >= 1) return progress
    let t = progress
    for (let i = 0; i < 8; i++) {
      const slope = dx(t)
      if (Math.abs(slope) < 1e-6) break
      const next = t - (x(t) - progress) / slope
      if (next < 0 || next > 1) break
      t = next
    }
    if (Math.abs(x(t) - progress) > 1e-5) {
      let low = 0
      let high = 1
      for (let i = 0; i < 40; i++) {
        t = (low + high) / 2
        if (x(t) < progress) low = t
        else high = t
      }
    }
    return y(t)
  }
}

const KEYWORDS: Record<string, readonly [number, number, number, number]> = {
  ease: [0.25, 0.1, 0.25, 1],
  'ease-in': [0.42, 0, 1, 1],
  'ease-out': [0, 0, 0.58, 1],
  'ease-in-out': [0.42, 0, 0.58, 1],
}

/** A CSS easing native can play: linear, the keywords and cubic-bezier(). */
export function easingFunction(easing: string): (progress: number) => number {
  const text = easing.trim()
  if (text === 'linear') return (progress) => progress
  const keyword = KEYWORDS[text]
  if (keyword) return cubicBezier(...keyword)
  const match = /^cubic-bezier\(([^)]*)\)$/.exec(text)
  const points = match?.[1]?.split(',').map((part) => Number(part.trim()))
  if (points?.length === 4 && points.every(Number.isFinite))
    return cubicBezier(...(points as [number, number, number, number]))
  return error(
    `easing ${JSON.stringify(easing)} cannot play on native; use linear, ease, ease-in, ease-out, ease-in-out or cubic-bezier()`,
  )
}

/** One keyframe value as channels. */
function channelsOf(property: MotionProperty, value: unknown, name: string) {
  if (!isColor(property)) return [finite(Number(value), `${name} ${property}`)]
  const color =
    parseColor(value) ??
    error(
      `animation '${name}' ${property} on native must be a colour literal; got ${JSON.stringify(value)}`,
    )
  return colorChannels(color)
}

/** Opacity rests at 1 when the committed style leaves it out. */
const restingChannels = (
  property: MotionProperty,
  committed: Channels,
  name: string,
): number[] =>
  committed[property] ??
  (property === 'opacity'
    ? [1]
    : error(
        `animation '${name}' leaves ${property} out of a keyframe at an end, and the part commits no ${property} to animate from`,
      ))

/**
 * Starts playing `animation` (from `animationOf(props)` on a native part) on
 * a native host. Pass the tree's shared `clock`, and a `reducedMotion`
 * preference: while it is on, a resting mode writes its static frame and
 * schedules nothing, and `'keep'` keeps playing. A host has one motion
 * controller: this one, or a transition's.
 */
export function attachAnimation(
  host: object,
  animation: NativeAnimation,
  context: {
    clock?: MotionClock
    reducedMotion?: boolean | ReducedMotionSource
  } = {},
): AnimationController {
  if (!nativeHostAdapter(host))
    error(
      'attachAnimation plays a system animation on a native host; the web plays it from the generated CSS',
    )
  const { name } = animation
  const tracks = new Map<MotionProperty, { offset: number; value: unknown }[]>()
  for (const [selector, frame] of Object.entries(animation.keyframes)) {
    const offsets = selector
      .split(',')
      .map((part) =>
        part.trim() === 'from'
          ? 0
          : part.trim() === 'to'
            ? 100
            : Number.parseFloat(part),
      )
    for (const [property, value] of Object.entries(frame)) {
      if (!supportsMotionProperty(property))
        return error(
          `animation '${name}' animates ${property}, which native cannot animate; native animates opacity, lengths, colours and translateX/translateY/rotate/scale`,
        )
      const track = tracks.get(property) ?? []
      for (const offset of offsets) {
        const existing = track.findIndex((point) => point.offset === offset)
        if (existing >= 0) track.splice(existing, 1)
        track.push({ offset: offset / 100, value })
      }
      tracks.set(property, track)
    }
  }
  const properties = [...tracks.keys()]
  const ease = easingFunction(animation.easing)
  const clock = context.clock ?? frameClock
  const source =
    typeof context.reducedMotion === 'object'
      ? context.reducedMotion
      : undefined
  let reduced = source?.current() ?? context.reducedMotion === true
  const { duration, delay, iterations, direction, fillMode } = animation
  if (!(duration >= 0) || !(delay > -Infinity) || !(iterations >= 0))
    error(
      `animation '${name}' needs a finite duration, delay and iteration count`,
    )
  const total = duration * iterations

  let committed: HostOutput = {}
  let resting: Channels = {}
  let write: (output: HostOutput) => void = () => {}
  let started = 0
  let frame: unknown
  let scheduled = false
  let disposed = false

  /** Each property's points across one iteration, ends filled from the committed style. */
  const points = (): Map<MotionProperty, Point[]> =>
    new Map(
      properties.map((property) => {
        const declared = tracks
          .get(property)!
          .map(({ offset, value }) => ({
            offset,
            channels: channelsOf(property, value, name),
          }))
          .sort((a, b) => a.offset - b.offset)
        if (declared[0]!.offset > 0)
          declared.unshift({
            offset: 0,
            channels: restingChannels(property, resting, name),
          })
        if (declared.at(-1)!.offset < 1)
          declared.push({
            offset: 1,
            channels: restingChannels(property, resting, name),
          })
        return [property, declared]
      }),
    )
  let timeline = new Map<MotionProperty, Point[]>()
  const commit = (next: HostOutput) => {
    committed = next
    resting = readNative(
      next['style'] as Record<string, unknown> | undefined,
      properties,
    )
    timeline = points()
  }

  /** The iteration offset at `local` ms after the delay, or undefined when nothing shows. */
  const offsetAt = (local: number): number | undefined => {
    const reversedAt = (index: number) =>
      direction === 'reverse' ||
      (direction === 'alternate' && index % 2 === 1) ||
      (direction === 'alternate-reverse' && index % 2 === 0)
    if (local < 0)
      return fillMode === 'backwards' || fillMode === 'both'
        ? reversedAt(0)
          ? 1
          : 0
        : undefined
    if (local >= total) {
      if (fillMode !== 'forwards' && fillMode !== 'both') return undefined
      const whole = Number.isInteger(iterations)
      const index = whole ? Math.max(0, iterations - 1) : Math.floor(iterations)
      const progress = whole ? 1 : iterations - Math.floor(iterations)
      return reversedAt(index) ? 1 - progress : progress
    }
    const index = duration === 0 ? 0 : Math.floor(local / duration)
    const progress = duration === 0 ? 1 : (local - index * duration) / duration
    return reversedAt(index) ? 1 - progress : progress
  }

  const channelsAt = (offset: number): Channels => {
    const channels: Channels = {}
    for (const [property, list] of timeline) {
      let upper = list.findIndex((point) => point.offset >= offset)
      if (upper <= 0) upper = Math.max(upper, 1)
      const a = list[upper - 1]!
      const b = list[upper]!
      const span = b.offset - a.offset
      const amount = span === 0 ? 1 : ease((offset - a.offset) / span)
      channels[property] = a.channels.map((value, i) =>
        finite(value + (b.channels[i]! - value) * amount, `${property} value`),
      )
    }
    return channels
  }

  const paint = (time: number) => {
    const offset = offsetAt(time - started - delay)
    write(
      offset === undefined
        ? committed
        : {
            ...committed,
            style: writeStyle(
              committed['style'] as Record<string, unknown> | undefined,
              channelsAt(offset),
              true,
            ),
          },
    )
  }
  const cancel = () => {
    if (scheduled) clock.cancel(frame)
    scheduled = false
  }
  const request = () => {
    if (disposed || scheduled) return
    scheduled = true
    frame = clock.request((time) => {
      scheduled = false
      if (disposed) return
      finite(time, 'frame timestamp')
      paint(time)
      if (time - started - delay < total) request()
    })
  }
  /** Reduced motion on a resting mode: the static frame, nothing scheduled. */
  const settle = () => {
    cancel()
    const still = reducedMotionFrame(
      animation as unknown as AnimationDefinition,
      animation.reducedMotion,
      name,
    )!
    write({
      ...committed,
      style: nativeFrameStyle(
        (committed['style'] as Record<string, unknown>) ?? {},
        still,
      ),
    })
  }
  const still = () => reduced && animation.reducedMotion !== 'keep'
  const play = () => {
    started = finite(clock.now(), 'frame clock')
    paint(started)
    request()
  }

  const detach = interceptHostOutput(host, (initial, writer) => {
    write = writer
    commit(initial)
    if (still()) settle()
    else play()
    return {
      update(next) {
        if (disposed) return
        commit(next)
        if (still()) settle()
        else paint(clock.now())
      },
      cancel,
      dispose() {
        disposed = true
        cancel()
        unsubscribe?.()
      },
    }
  })
  const unsubscribe = source?.subscribe((value) => {
    reduced = value
    if (disposed) return
    if (still()) settle()
    else if (!scheduled) play()
  })
  return {
    dispose: detach,
    get running() {
      return scheduled
    },
  }
}
