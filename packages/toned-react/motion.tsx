import {
  attachMotion,
  type MotionController,
  type MotionOptions,
  type MotionResult,
} from '@toned/core/motion'
import { useCallback, useMemo, useRef } from 'react'

/**
 * Pass ref to a Toned part. Keep options identity stable (module constant/useMemo).
 * For exit, retain the part until exit() resolves, then remove it from your tree.
 */
export function useMotion(options: MotionOptions) {
  const attachment = useRef<
    | { host: object; options: MotionOptions; controller: MotionController }
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
      } else if (previous?.host !== host || previous.options !== options) {
        previous?.controller.dispose()
        attachment.current = {
          host,
          options,
          controller: attachMotion(host, options),
        }
      }
      // React 18 calls ref(null); avoiding returned cleanup works on React 19 too.
    },
    [options],
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
