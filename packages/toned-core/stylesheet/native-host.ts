/** Explicit native host capability; a method named setNativeProps is not a contract. */
export type NativePatch = Record<string, unknown>
export type NativeHostAdapter = Readonly<{
  /** Stable integration identity, including its renderer and version. */
  id: string
  renderer: 'fabric' | 'paper' | 'custom'
  version: string
  accepts: (host: object) => boolean
  /** Optional logical parent contract for relations. Native renderers without
   * public parent traversal provide it from their committed part-registration context. */
  parentOf?: (host: object) => object | undefined
  /** Notify after committed reparenting; return an idempotent unsubscribe. */
  subscribeTopology?: (notify: () => void) => () => void
  /** Committed semantic facts, including input-modality-aware focus-visible.
   * The integration must throw for unsupported state names, never silently
   * substitute ordinary focus. Notify through subscribeState or subscribeTopology. */
  readState?: (host: object, state: string) => boolean
  /** Optional finite capability list; names are public facts/aliases, not CSS selectors. */
  states?: readonly string[]
  /** Committed behavior-state changes. subscribeTopology remains a compatibility fallback. */
  subscribeState?: (notify: () => void) => () => void
  /** Logical viewport width (React Native Dimensions width), read after commit. */
  getViewportWidth?: () => number
  subscribeViewport?: (notify: () => void) => () => void
  /** Merge patch: values absent from the patch must remain unchanged. */
  patch: (host: object, props: NativePatch) => void
  /** Values the declared host uses to remove an imperative override. */
  resetStyle: (property: string) => unknown
  resetProp: (property: string) => unknown
}>

const hosts = new WeakMap<
  object,
  { adapter: NativeHostAdapter; owners: number }
>()

/** Registration happens at committed attachment; adapters never inspect render candidates. */
export function registerNativeHost(
  host: object,
  adapter: NativeHostAdapter,
): () => void {
  if (!adapter.id || !adapter.version || !adapter.accepts(host))
    throw new Error(
      `[toned/native] Host rejected by ${adapter.id || 'unnamed adapter'}`,
    )
  const previous = hosts.get(host)
  if (previous && previous.adapter !== adapter)
    throw new Error(
      `[toned/native] Conflicting adapters for one host: ${previous.adapter.id} and ${adapter.id}`,
    )
  const entry = previous ?? { adapter, owners: 0 }
  entry.owners++
  hosts.set(host, entry)
  let active = true
  return () => {
    if (!active) return
    active = false
    if (--entry.owners === 0) hosts.delete(host)
  }
}

export function nativeHostAdapter(host: object): NativeHostAdapter | undefined {
  return hosts.get(host)?.adapter
}

/** An integration owns host identity checks; this helper only supplies RN patch semantics.
 * It does not certify a renderer/version. Run that host's conformance application first.
 */
export function defineReactNativeHost(options: {
  renderer: 'fabric' | 'paper'
  version: string
  isHost: (host: object) => boolean
}): NativeHostAdapter {
  const { renderer, version, isHost } = options
  return Object.freeze({
    id: `react-native/${version}/${renderer}`,
    renderer,
    version,
    accepts: (host: object) =>
      isHost(host) &&
      typeof (host as { setNativeProps?: unknown }).setNativeProps ===
        'function',
    patch: (host: object, props: NativePatch) =>
      (host as { setNativeProps(props: NativePatch): void }).setNativeProps(
        props,
      ),
    resetStyle: () => null,
    resetProp: () => null,
  })
}
