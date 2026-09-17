import { type Config, getConfig, SYMBOL_INIT } from '@toned/core'
import type { Base } from '@toned/core/stylesheet'
import {
  type Context,
  createContext,
  createElement,
  forwardRef,
  type ReactElement,
  type ReactNode,
  useContext,
  useLayoutEffect,
  useMemo,
  useSyncExternalStore,
} from 'react'
// Cycle-safe: index.ts imports this module for its typed re-exports, and this
// line imports back. `useStyles` is a hoisted function declaration, so its
// binding is live before index.ts finishes evaluating; `useBind` only calls it
// at render time regardless. No runtime state crosses at module load.
import { useStyles } from './index.ts'
import { type HostProps, PartHost } from './part-host.tsx'
import { useRuntimeConfig } from './runtime-config.ts'
import { controllerOf, elementProps } from './style-view.ts'

// biome-ignore lint/suspicious/noExplicitAny: the runtime binding is stylesheet-agnostic; index.ts provides the precise typed surface.
type AnyProps = Record<string, any>

/**
 * The prop-bag `getProps` returns already carries a non-enumerable `with`. A
 * bound component surfaces that same shape (`s.Root.with(...)` / `.style` /
 * `.className`) so a component can mix `<s.Root/>` structure with hand-spread
 * escape hatches on the SAME element.
 */
type Bag = AnyProps & { with: (p: AnyProps | false | null | undefined) => Bag }

/** A bound element: a component that ALSO carries the raw prop-bag. */
export type BoundElement = ((props?: AnyProps) => ReactElement) & Bag

const EmptyRenderContext = createContext<Instance | null>(null)

type Instance = Base

// biome-ignore lint/suspicious/noExplicitAny: matches StylesheetLike in index.ts.
type StylesheetLike = { [SYMBOL_INIT]: (...args: any[]) => any }

/**
 * Build one stable component per element, over a getter for the CURRENT
 * committed resolution. Each family has a stable identity; render snapshots
 * travel through its optional context rather than mutating these functions.
 */
export function buildBoundMap(
  getInstance: () => Instance,
  config: Config,
  subscribe?: (listener: () => void) => () => void,
  renderContext: Context<Instance | null> = EmptyRenderContext,
): Record<string, BoundElement> {
  const resolveElement = config.resolveElement
  if (typeof resolveElement !== 'function') {
    throw new Error(
      'useBind/bind require a config with resolveElement — install @toned/react/react-web ' +
        '(or a host config that sets resolveElement). @toned/react/config alone has none.',
    )
  }

  const map: Record<string, BoundElement> = {}
  for (const descriptor of getInstance().elementDescriptors()) {
    map[descriptor.key] = buildBoundElement(
      getInstance,
      descriptor.key,
      subscribe,
      renderContext,
    )
  }
  return map
}

function buildBoundElement(
  getInstance: () => Instance,
  key: string,
  subscribe: ((listener: () => void) => () => void) | undefined,
  renderContext: Context<Instance | null>,
): BoundElement {
  const subscribeToInstance = subscribe ?? (() => () => {})
  const Comp = forwardRef<unknown, HostProps>(function BoundPart(props, ref) {
    const snapshot = useContext(renderContext)
    const committed = useSyncExternalStore(
      subscribeToInstance,
      getInstance,
      getInstance,
    )
    const instance = snapshot ?? committed
    useLayoutEffect(() => {
      // Module-level bind has no owning hook; the host owns its lifecycle.
      if (!subscribe) return instance.mount()
      instance.validateHosts()
    }, [instance, subscribe])
    return createElement(PartHost, {
      instance,
      part: key,
      props: ref ? { ...props, ref } : props,
    })
  })
  return Comp as unknown as BoundElement
}

/** Publish compatibility accessors only from a commit (or module-level bind). */
export function reflectBags(
  map: Record<string, BoundElement>,
  instance: Instance,
): void {
  for (const key in map) {
    const comp = map[key]!
    const bag = elementProps(instance, key) as Bag
    if (!bag)
      throw new Error(
        `[toned] Bound part ${key} has no prop accessor; available parts: ${Object.getOwnPropertyNames(Object.getPrototypeOf(instance)).join(', ')}`,
      )
    Object.assign(comp, bag)
    // Non-enumerable, matching the bag's own `with`: a plain assignment made
    // it enumerable on the COMPONENT, so `{...s.El}` leaked a `with` function
    // into DOM props (React warns and drops it).
    for (const name of ['with', 'withProps'])
      Object.defineProperty(comp, name, {
        value: bag.with,
        enumerable: false,
        configurable: true,
        writable: true,
      })
  }
}

/**
 * Mod-less module-level binding: `const { Root, Label } = bind(styles)`.
 * Resolves once with the current global config; no hook, no mods.
 */
export function bind(styles: StylesheetLike): Record<string, BoundElement> {
  const config = getConfig()
  const instance = styles[SYMBOL_INIT](config, undefined) as Instance
  const map = buildBoundMap(
    () => instance,
    (instance as AnyProps)['config'] ?? config,
  )
  reflectBags(map, instance)
  return map
}

/**
 * The general form: same arguments as `useStyles` (mods in the hook call), one
 * resolution shared with it, but returns COMPONENTS. Element identities are
 * stable across renders (the map is keyed on the stylesheet, built once); mods
 * flow anew because the components read the live resolution through a ref.
 */
export function useBind(
  styles: StylesheetLike,
  ...mods: [] | [AnyProps]
): Record<string, BoundElement> {
  // useStyles supplies a private render candidate; publication happens below.
  const instance = controllerOf(
    (useStyles as unknown as (s: StylesheetLike, m?: AnyProps) => object)(
      styles,
      mods[0],
    ),
  ) as Instance

  const config = useRuntimeConfig()
  // The candidate is the initial snapshot only; later candidates publish below.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  // biome-ignore lint/correctness/useExhaustiveDependencies: stylesheet/config own the component family; instance only seeds it, subsequent candidates publish at commit.
  const store = useMemo(() => {
    const store = {
      current: instance,
      context: createContext<Instance | null>(null),
      listeners: new Set<() => void>(),
      map: {} as Record<string, BoundElement>,
    }
    store.map = buildBoundMap(
      () => store.current,
      (instance as AnyProps)['config'] ?? config,
      (listener) => {
        store.listeners.add(listener)
        return () => {
          store.listeners.delete(listener)
        }
      },
      store.context,
    )
    return store
    // A stylesheet owns the stable component family; candidates publish only
    // in the layout effect below. React discards this memo with an abandoned
    // stylesheet switch instead of mutating the committed family's ref.
  }, [styles, config])
  useLayoutEffect(() => {
    store.current = instance
    reflectBags(store.map, instance)
    for (const listener of store.listeners) listener()
  }, [store, instance])
  // Stable components expose committed bags for backwards compatibility.
  // Render-current spread props are immutable and travel with this render.
  const props: Record<string, Bag> = {}
  for (const { key } of instance.elementDescriptors())
    Object.defineProperty(props, key, {
      enumerable: true,
      // Each access binds a different host to this same render snapshot.
      get: () => elementProps(instance, key) as Bag,
    })
  Object.freeze(props)
  return {
    ...store.map,
    $props: props as any,
    $scope: ((children: ReactNode) =>
      createElement(
        store.context.Provider,
        { value: instance },
        children,
      )) as any,
  }
}
