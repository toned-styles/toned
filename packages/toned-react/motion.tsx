import {
  attachMotion,
  type MotionClock,
  type MotionController,
  type MotionDeclaration,
  type MotionOptions,
  type MotionResult,
  type MotionStateSource,
} from '@toned/core/motion'
import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useMemo,
  useRef,
} from 'react'

const ClockContext = createContext<MotionClock | undefined>(undefined)

/**
 * Shares one motion clock with every `useMotion` below it, so a test, a
 * replay or Weft's UI runner steps all of the tree's motion together.
 * Keep the clock's identity stable: a new clock replaces each controller.
 */
export function MotionClockProvider({
  clock,
  children,
}: {
  clock: MotionClock
  children?: ReactNode
}) {
  return <ClockContext.Provider value={clock}>{children}</ClockContext.Provider>
}

/**
 * Pass ref to a Toned part. Keep options identity stable (module constant/useMemo).
 * For exit, retain the part until exit() resolves, then remove it from your tree.
 */
export function useMotion(
  options: MotionOptions | MotionDeclaration,
  /** Where state-keyed motion reads its states, such as a Weft run's waits. */
  context: { states?: MotionStateSource } = {},
) {
  const clock = useContext(ClockContext)
  const states = context.states
  const attachment = useRef<
    | {
        host: object
        options: MotionOptions | MotionDeclaration
        clock?: MotionClock
        states?: MotionStateSource
        controller: MotionController
      }
    | undefined
  >(undefined)
  const generation = useRef(0)
  const ref = useCallback(
    (host: object | null) => {
      const ticket = ++generation.current
      const previous = attachment.current
      if (!host) {
        // React ref handoffs can detach/reattach the same host during one commit.
        // Retain the controller until final detachment, matching Toned ownership.
        queueMicrotask(() => {
          if (ticket !== generation.current) return
          attachment.current?.controller.dispose()
          attachment.current = undefined
        })
      } else if (
        previous?.host !== host ||
        previous.options !== options ||
        previous.clock !== clock ||
        previous.states !== states
      ) {
        previous?.controller.dispose()
        attachment.current = {
          host,
          options,
          clock,
          states,
          controller: attachMotion(host, options, {
            ...(clock ? { clock } : {}),
            ...(states ? { states } : {}),
          }),
        }
      }
      // React 18 calls ref(null); avoiding returned cleanup works on React 19 too.
    },
    [options, clock, states],
  )
  return useMemo(
    () => ({
      ref,
      exit: (): Promise<MotionResult> =>
        attachment.current?.controller.exit() ?? Promise.resolve('cancelled'),
      finish: () => attachment.current?.controller.finish(),
    }),
    [ref],
  )
}
