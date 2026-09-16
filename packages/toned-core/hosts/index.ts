import type { Config, TokenSystem } from '../types/index.ts'
import { createDomIntegration } from './dom.ts'
import { createNativeIntegration } from './native.ts'
import type { HostIntegration } from './types.ts'

export type { HostIntegration } from './types.ts'
export { eventState } from './types.ts'

// Integrations contain no mounted state. Share them by immutable system/adapter
// identity so render candidates do not allocate host method closures.
const dom = new WeakMap<object, HostIntegration>()
const native = new WeakMap<object, WeakMap<object, HostIntegration>>()
const nativeWithoutAdapter = new WeakMap<object, HostIntegration>()

/** Platform selection belongs at the integration boundary, not in the controller. */
export function createHostIntegration(
  config: Config,
  system: TokenSystem<any>,
): HostIntegration {
  if (config.platform !== 'native') {
    let integration = dom.get(system)
    if (!integration) {
      integration = createDomIntegration(system)
      dom.set(system, integration)
    }
    return integration
  }
  const adapter = config.nativeHost
  if (!adapter) {
    let integration = nativeWithoutAdapter.get(system)
    if (!integration) {
      integration = createNativeIntegration(system)
      nativeWithoutAdapter.set(system, integration)
    }
    return integration
  }
  let adapters = native.get(system)
  if (!adapters) {
    adapters = new WeakMap()
    native.set(system, adapters)
  }
  let integration = adapters.get(adapter)
  if (!integration) {
    integration = createNativeIntegration(system, adapter)
    adapters.set(adapter, integration)
  }
  return integration
}
