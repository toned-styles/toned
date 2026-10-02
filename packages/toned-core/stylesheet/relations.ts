/** Logical registered-part relationships, isolated to one mounted stylesheet instance.
 * A portal participates only when the host explicitly supplies its logical parent.
 * Unregistered intermediary hosts are represented by their nearest registered ancestor.
 */
export type Relation = Readonly<{
  scope: 'child' | 'descendant'
  sourcePart: string
  part: string
  state: string
}>
type Entry = { part: string; parent?: object; states: Set<string> }

export class PartRelations {
  private batching = 0
  private dirty = false

  batch<T>(update: () => T): T {
    this.batching++
    try {
      return update()
    } finally {
      if (--this.batching === 0 && this.dirty) {
        this.dirty = false
        this.publish()
      }
    }
  }

  private readonly entries = new Map<object, Entry>()
  private readonly subscriptions = new Set<{
    relation: Relation
    current: boolean
    notify: (value: boolean) => void
  }>()

  register(host: object, part: string, parent?: object): () => void {
    if (this.entries.has(host))
      throw new Error('Toned: a relation target is already registered')
    this.assertParent(host, parent)
    this.entries.set(host, { part, parent, states: new Set() })
    this.publish()
    let attached = true
    return () => {
      if (!attached) return
      attached = false
      this.entries.delete(host)
      // Children remain registered but disconnected. Reattaching their parent
      // reconnects them; unmounting never silently reparents them to a grandparent.
      this.publish()
    }
  }

  move(host: object, parent?: object): void {
    const entry = this.entries.get(host)
    if (!entry)
      throw new Error('Toned: cannot move an unregistered relation target')
    this.assertParent(host, parent)
    if (entry.parent === parent) return
    entry.parent = parent
    this.publish()
  }

  setState(host: object, state: string, active: boolean): void {
    const entry = this.entries.get(host)
    if (!entry) return
    if (entry.states.has(state) === active) return
    if (active) entry.states.add(state)
    else entry.states.delete(state)
    this.publish()
  }

  matches(relation: Relation): boolean {
    for (const [host, entry] of this.entries) {
      if (entry.part !== relation.part || !entry.states.has(relation.state))
        continue
      let parent = entry.parent
      while (parent && parent !== host) {
        const ancestor = this.entries.get(parent)
        if (!ancestor) break
        if (ancestor.part === relation.sourcePart) return true
        if (relation.scope === 'child') break
        parent = ancestor.parent
      }
    }
    return false
  }

  /** The initial fact is delivered immediately; later notifications are edge-triggered. */
  subscribe(relation: Relation, notify: (value: boolean) => void): () => void {
    const subscription = { relation, current: this.matches(relation), notify }
    this.subscriptions.add(subscription)
    notify(subscription.current)
    return () => {
      this.subscriptions.delete(subscription)
    }
  }

  clear(): void {
    this.entries.clear()
    this.publish()
    this.subscriptions.clear()
  }

  private assertParent(host: object, parent?: object): void {
    const seen = new Set([host])
    while (parent) {
      if (seen.has(parent)) throw new Error('Toned: cyclic part relationship')
      seen.add(parent)
      parent = this.entries.get(parent)?.parent
    }
  }

  private publish(): void {
    if (this.batching) {
      this.dirty = true
      return
    }
    for (const subscription of this.subscriptions) {
      const next = this.matches(subscription.relation)
      if (next === subscription.current) continue
      subscription.current = next
      subscription.notify(next)
    }
  }
}

/** Length-safe primitive identity used only at the legacy matcher boundary. */
export const relationFactKey = (relation: Relation): string =>
  `relation:${JSON.stringify([relation.scope, relation.sourcePart, relation.part, relation.state])}`
