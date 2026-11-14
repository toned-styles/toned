/**
 * Motion clocks. A clock is the frame scheduler and the millisecond time base
 * for every controller it is given; share one value across a tree so tests,
 * replays and Weft's UI runner step all motion together.
 */

/** Frame scheduling and time in one millisecond base. Callbacks must be
 *  delivered asynchronously and handles must be cancellable. */
export type MotionClock = {
  now(): number
  request(callback: (time: number) => void): unknown
  cancel(handle: unknown): void
}

/** The browser clock: `requestAnimationFrame` and `performance.now()`. */
export const frameClock: MotionClock = Object.freeze({
  now: () => performance.now(),
  request: (callback: (time: number) => void) => {
    if (typeof requestAnimationFrame !== 'function')
      throw new Error(
        '[toned/motion] Provide a motion clock on hosts without requestAnimationFrame',
      )
    return requestAnimationFrame(callback)
  },
  cancel: (handle: unknown) => cancelAnimationFrame(handle as number),
})

export type TestClock = MotionClock & {
  /**
   * Moves time forward by `ms`, delivering pending callbacks once per frame
   * and once more at the end time. Returns the number of frames delivered.
   * Time jumps straight to the end once nothing is pending.
   */
  advance(ms: number): number
  /** Delivers one frame, `frame` milliseconds later. */
  frame(): void
  /** Callbacks waiting for the next frame. */
  readonly pending: number
}

/** A deterministic clock for tests and replays: time moves only when told. */
export function createTestClock(
  options: { start?: number; frame?: number } = {},
): TestClock {
  const frameLength = options.frame ?? 16
  if (!(frameLength > 0) || !Number.isFinite(frameLength))
    throw new Error('[toned/motion] A test clock frame must be positive')
  let time = options.start ?? 0
  let sequence = 0
  let queue = new Map<number, (time: number) => void>()
  const deliver = (at: number) => {
    time = at
    // Callbacks requested while delivering belong to the next frame.
    const callbacks = [...queue.values()]
    queue = new Map()
    for (const callback of callbacks) callback(at)
  }
  return {
    now: () => time,
    request(callback) {
      queue.set(++sequence, callback)
      return sequence
    },
    cancel(handle) {
      queue.delete(handle as number)
    },
    get pending() {
      return queue.size
    },
    frame() {
      deliver(time + frameLength)
    },
    advance(ms) {
      if (!(ms >= 0) || !Number.isFinite(ms))
        throw new Error('[toned/motion] advance(ms) takes a non-negative time')
      const end = time + ms
      let frames = 0
      while (queue.size && time < end) {
        deliver(Math.min(end, time + frameLength))
        frames++
      }
      time = end
      return frames
    },
  }
}
