/** Controller-facing host capabilities. Targets are opaque identities. */
export interface HostIntegration {
  /** Non-event facts supplied by a native primitive/behavior integration. */
  semanticStates?: {
    validate(states: readonly string[]): void
    read(target: object, state: string): boolean
    subscribe(notify: () => void): () => void
  }
  connected(target: object): boolean
  validateRelations(states: readonly string[]): void
  parentOf(target: object): object | undefined
  readState(target: object, state: string): boolean
  subscribeRelations(targets: Iterable<object>, notify: () => void): () => void
  connectMedia(
    keys: readonly string[],
    notify: (facts: Partial<Record<string, boolean>>) => void,
  ): {
    state: Partial<Record<string, boolean>>
    stop: () => void
  }
  attach(
    target: object,
    declaration: Readonly<Record<string, unknown>>,
  ): (() => void) | undefined
  validate(target: object): void
}

/** These facts belong to committed events, never a host selector reread. */
export const eventState = (state: string) =>
  ['hover', 'active', 'focus'].includes(state)
