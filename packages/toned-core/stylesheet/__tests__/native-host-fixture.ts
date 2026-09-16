import { type NativeHostAdapter, registerNativeHost } from '../native-host.ts'
export const fixtureNativeHost: NativeHostAdapter = Object.freeze({
  id: 'toned-test/merge-patch',
  renderer: 'custom',
  version: '1',
  accepts: (host: object) =>
    typeof (host as { setNativeProps?: unknown }).setNativeProps === 'function',
  patch: (host: object, props: Record<string, unknown>) =>
    (
      host as { setNativeProps(p: Record<string, unknown>): void }
    ).setNativeProps(props),
  resetStyle: () => null,
  resetProp: () => null,
})
export function registerFixtureHost<T extends object>(host: T): T {
  registerNativeHost(host, fixtureNativeHost)
  return host
}
