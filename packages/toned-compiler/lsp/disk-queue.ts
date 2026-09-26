type Operation = () => Promise<boolean>
interface Pending {
  operation: Operation
  promise: Promise<boolean>
  resolve(value: boolean): void
  reject(error: unknown): void
}
interface Slot {
  next?: Pending
}
/** Serialize disk reads and publication per URI. A concurrent request gets one
 * coalesced follow-up, which reads after the active writer settles, never before. */
export class WorkspaceDiskQueue {
  private readonly slots = new Map<string, Slot>()
  private disposed = false
  run(uri: string, operation: Operation): Promise<boolean> {
    if (this.disposed)
      return Promise.reject(new Error('Toned disk index disposed'))
    const slot = this.slots.get(uri)
    if (slot) {
      if (slot.next) {
        slot.next.operation = operation
        return slot.next.promise
      }
      let resolve!: (value: boolean) => void, reject!: (error: unknown) => void
      const promise = new Promise<boolean>((yes, no) => {
        resolve = yes
        reject = no
      })
      slot.next = { operation, promise, resolve, reject }
      return promise
    }
    if (this.slots.size >= 128)
      return Promise.reject(
        new Error('Toned concurrent disk-file budget exceeded'),
      )
    const created: Slot = {}
    this.slots.set(uri, created)
    return this.execute(uri, created, operation)
  }
  private async execute(
    uri: string,
    slot: Slot,
    operation: Operation,
  ): Promise<boolean> {
    try {
      return await operation()
    } finally {
      const next = slot.next
      slot.next = undefined
      if (next && !this.disposed)
        void this.execute(uri, slot, next.operation).then(
          next.resolve,
          next.reject,
        )
      else {
        this.slots.delete(uri)
        next?.reject(new Error('Toned disk index disposed'))
      }
    }
  }
  dispose() {
    this.disposed = true
    for (const slot of this.slots.values()) {
      slot.next?.reject(new Error('Toned disk index disposed'))
      slot.next = undefined
    }
    this.slots.clear()
  }
}
