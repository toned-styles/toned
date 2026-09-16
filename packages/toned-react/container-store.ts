/** Stable hierarchical runtime measurements. Width changes notify controllers,
 * never React context consumers; nearest same-name containers shadow ancestors. */
export class ContainerSizesStore {
  private readonly parent?: ContainerSizesStore
  private readonly values: Record<string, number>
  private readonly listeners = new Set<() => void>()
  private stopParent?: () => void
  private lastParent?: Readonly<Record<string, number>>
  private current: Readonly<Record<string, number>>
  private changed = true
  // snapshot() may run in speculative renders or another parent's listener.
  // Reading the cache must never consume a notification owed to subscribers.
  private published?: Readonly<Record<string, number>>

  constructor(
    parent?: ContainerSizesStore,
    initial: Readonly<Record<string, number>> = {},
  ) {
    this.parent = parent
    this.values = { ...initial }
    this.current = Object.freeze({})
  }

  snapshot(): Readonly<Record<string, number>> {
    const inherited = this.parent?.snapshot()
    if (!this.changed && inherited === this.lastParent) return this.current
    const next = { ...inherited, ...this.values }
    this.lastParent = inherited
    this.changed = false
    if (
      Object.keys(next).length !== Object.keys(this.current).length ||
      Object.keys(next).some((key) => next[key] !== this.current[key])
    )
      this.current = Object.freeze(next)
    return this.current
  }

  set(name: string, width: number): void {
    if (!Number.isFinite(width) || width < 0)
      throw new Error(
        'Toned: container width must be a finite nonnegative number',
      )
    if (this.values[name] === width) return
    const previous = this.snapshot()
    this.values[name] = width
    this.changed = true
    if (this.snapshot() !== previous) this.notify()
  }

  subscribe(notify: () => void): () => void {
    const current = this.snapshot()
    if (!this.listeners.size) this.published = current
    const listener = () => notify()
    this.listeners.add(listener)
    if (this.parent && !this.stopParent) {
      this.stopParent = this.parent.subscribe(() => {
        if (this.snapshot() !== this.published) this.notify()
      })
    }
    let active = true
    return () => {
      if (!active) return
      active = false
      this.listeners.delete(listener)
      if (!this.listeners.size) {
        this.stopParent?.()
        this.stopParent = undefined
      }
    }
  }

  private notify() {
    this.published = this.snapshot()
    for (const listener of this.listeners) listener()
  }
}
