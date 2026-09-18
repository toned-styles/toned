import { PartRelations } from './relations.ts'
import type { Base } from './StyleSheet.ts'

export type ContainerSizes = Readonly<Record<string, number>>
type HostConditionRegistration = {
  part: string
  readSizes: () => ContainerSizes
}

/** Mutable ownership belongs to a mounted family, not each speculative render.
 * Candidates inherit this identity; only committed host/lifecycle work writes it. */
export class MountedFamily {
  constructor(public current: Base) {}

  readonly relations = new PartRelations()
  readonly relationHosts = new Map<
    object,
    { part: string; detach: () => void }
  >()
  readonly hostConditions = new Map<object, HostConditionRegistration>()
  readonly pendingHostValidation = new Set<object>()
  private readonly hostValidationListeners = new Set<() => void>()
  hostValidationRevision = 0
  stopRelations: (() => void)[] = []
  stopStates?: () => void

  subscribeHostValidation(notify: () => void): () => void {
    this.hostValidationListeners.add(notify)
    return () => {
      this.hostValidationListeners.delete(notify)
    }
  }

  queueHostValidation(node: object): void {
    const notify = this.pendingHostValidation.size === 0
    this.pendingHostValidation.add(node)
    if (!notify) return
    this.hostValidationRevision++
    for (const listener of this.hostValidationListeners) listener()
  }
}
