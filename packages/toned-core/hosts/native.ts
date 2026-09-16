import { connectNativeMedia } from '../stylesheet/media.native.ts'
import type { NativeHostAdapter } from '../stylesheet/native-host.ts'
import type { TokenSystem } from '../types/index.ts'
import { eventState, type HostIntegration } from './types.ts'

export function createNativeIntegration(
  system: TokenSystem<any>,
  adapter?: NativeHostAdapter,
): HostIntegration {
  // Ordinary and relational facts may share a behavior/topology source. Keep
  // one source subscription per shared integration and fan out locally.
  const subscriptions = new Map<
    (notify: () => void) => () => void,
    { listeners: Set<() => void>; stop: () => void }
  >()
  const subscribe = (
    register: (notify: () => void) => () => void,
    notify: () => void,
  ) => {
    let entry = subscriptions.get(register)
    if (!entry) {
      const listeners = new Set<() => void>([notify])
      const stop = register.call(adapter, () => {
        for (const listener of listeners) listener()
      })
      entry = { listeners, stop }
      subscriptions.set(register, entry)
    } else entry.listeners.add(notify)
    let active = true
    return () => {
      if (!active) return
      active = false
      entry.listeners.delete(notify)
      if (!entry.listeners.size) {
        entry.stop()
        subscriptions.delete(register)
      }
    }
  }
  const validateStates = (states: readonly string[]) => {
    if (!states.length) return
    if (
      !adapter?.readState ||
      !(adapter.subscribeState ?? adapter.subscribeTopology)
    )
      throw new Error(
        `Toned: native state ${states[0]} requires nativeHost.readState and subscribeState (or subscribeTopology)`,
      )
    const unsupported = states.find(
      (state) => adapter.states && !adapter.states.includes(state),
    )
    if (unsupported)
      throw new Error(
        `Toned: native host ${adapter.id} does not support state ${unsupported}`,
      )
  }
  const requireTopology = () => {
    if (!adapter?.parentOf || !adapter.subscribeTopology)
      throw new Error(
        'Toned: native relations require nativeHost.parentOf and subscribeTopology',
      )
    return adapter
  }
  return {
    semanticStates: {
      validate: validateStates,
      read: (target, state) => adapter!.readState!(target, state),
      subscribe: (notify) =>
        subscribe(
          (adapter!.subscribeState ?? adapter!.subscribeTopology)!,
          notify,
        ),
    },
    // Optional structural liveness remains a compatibility input. Ordinary RN
    // targets are released by their committed ref cleanup instead.
    connected: (target) =>
      (target as { isConnected?: boolean }).isConnected !== false,
    validateRelations(states) {
      if (!states.length) return
      const host = requireTopology()
      const semantic = states.find((state) => !eventState(state))
      if (semantic && !host.readState)
        throw new Error(
          `Toned: native relational state ${semantic} requires nativeHost.readState and subscribeTopology`,
        )
      validateStates(states.filter((state) => !eventState(state)))
    },
    parentOf: (target) => requireTopology().parentOf!(target),
    readState(target, state) {
      const host = requireTopology()
      if (!host.readState)
        throw new Error(
          `Toned: native relational state ${state} requires nativeHost.readState and subscribeTopology`,
        )
      return host.readState(target, state)
    },
    subscribeRelations: (_targets, notify) => {
      const host = requireTopology()
      const topology = subscribe(host.subscribeTopology!, notify)
      const state =
        host.subscribeState && host.subscribeState !== host.subscribeTopology
          ? subscribe(host.subscribeState, notify)
          : undefined
      return () => {
        topology()
        state?.()
      }
    },
    connectMedia: (keys, notify) =>
      connectNativeMedia(
        system.config?.breakpoints?.__breakpoints ?? {},
        keys,
        adapter,
        notify,
      ),
    attach: () => undefined,
    validate: () => {},
  }
}
