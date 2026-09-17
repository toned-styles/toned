import type { HostConditions } from '@toned/core'
import type { Base } from '@toned/core/stylesheet'

/** Attach ownership and nearest-container measurements in the same commit.
 * Both web and native use this path; speculative renders never subscribe. */
export function attachPart(
  instance: Base,
  part: string,
  node: object,
  toned: Record<string, unknown>,
  caller?: Record<string, unknown>,
  conditions?: HostConditions,
): () => void {
  const release = instance.attach(part, node, toned, caller)
  if (!conditions) return release
  let unbind: (() => void) | undefined
  let stop: (() => void) | undefined
  try {
    unbind = instance.bindHostConditions(part, node, conditions.readSizes)
    const sync = () =>
      instance.eventOwner(node).refreshHostConditions(part, node)
    stop = conditions.subscribe(sync)
    sync()
  } catch (error) {
    stop?.()
    unbind?.()
    release()
    throw error
  }
  return () => {
    stop?.()
    unbind?.()
    release()
  }
}
