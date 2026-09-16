import { useRuntimeConfig } from './runtime-config.ts'
import {
  createElement,
  createContext,
  type Context,
  type ReactNode,
  useContext,
  useMemo,
  useState,
  useLayoutEffect,
  useSyncExternalStore,
  type ReactElement,
} from 'react'
import { getConfig, SYMBOL_INIT, type Config, type ElementType } from '@toned/core'
import { ContainerSizesContext } from './containers.tsx'

/**
 * What a web intrinsic IMPLIES about the element's nature, for the native
 * fallback: `as="h2"` names a text element, so native renders the Text
 * primitive, not the default View. Only tags whose implication is
 * unambiguous are mapped; a declared `$$type` always wins over inference,
 * and anything unmapped falls back to it (default 'view'). `button`/`a` are
 * deliberately NOT mapped to 'pressable': press behavior must be declared,
 * never inferred from a tag.
 */
const TYPE_BY_TAG: Record<string, ElementType> = {
  h1: 'text',
  h2: 'text',
  h3: 'text',
  h4: 'text',
  h5: 'text',
  h6: 'text',
  p: 'text',
  span: 'text',
  label: 'text',
  legend: 'text',
  caption: 'text',
  figcaption: 'text',
  strong: 'text',
  em: 'text',
  b: 'text',
  i: 'text',
  s: 'text',
  u: 'text',
  small: 'text',
  mark: 'text',
  code: 'text',
  blockquote: 'text',
  cite: 'text',
  abbr: 'text',
  time: 'text',
  kbd: 'text',
  samp: 'text',
  sub: 'text',
  sup: 'text',
  img: 'image',
}
// Cycle-safe: index.ts imports this module for its typed re-exports, and this
// line imports back. `useStyles` is a hoisted function declaration, so its
// binding is live before index.ts finishes evaluating; `useBind` only calls it
// at render time regardless. No runtime state crosses at module load.
import { useStyles } from './index.ts'

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

type Instance = Record<string, Bag> & {
  elementDescriptors: () => Array<{ key: string; type?: ElementType }>
}

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
      config,
      descriptor,
      subscribe,
      renderContext,
    )
  }
  return map
}

function buildBoundElement(
  getInstance: () => Instance,
  config: Config,
  { key, type }: { key: string; type?: ElementType },
  subscribe: ((listener: () => void) => () => void) | undefined,
  renderContext: Context<Instance | null>,
): BoundElement {
  const subscribeToInstance = subscribe ?? (() => () => {})
  const resolveElement = config.resolveElement!
  // Resolve the host element LAZILY, on first render, not here. `resolveElement`
  // can throw (the native seam does until a host installs one), and building
  // the map runs at module import for `bind()`; a throw there would fault an
  // import from a component nobody rendered. Deferring it to render keeps the
  // component identity stable (identity is `Comp`, cached once — not `El`).
  let El: unknown
  function RenderCore(props: AnyProps = {}): ReactElement {
    // `key` is a declared element, so the getter never yields undefined.
    const snapshot = useContext(renderContext)
    const committed = useSyncExternalStore(subscribeToInstance, getInstance, getInstance)
    const instance = snapshot ?? committed
    useLayoutEffect(() => {
      // Module-level bind has no owning hook; the mounted host supplies its
      // lifecycle. useBind's parent owns commit publication instead.
      if (!subscribe) return (instance as AnyProps)['mount']?.()
      ;(instance as AnyProps)['validateHosts']?.()
    }, [instance, subscribe])
    const bag = instance[key]!
    // `as` overrides the `$$type`-selected primitive for this render: the
    // element renders exactly that component/intrinsic, with every other
    // prop merged through the same with() path. It never reaches the DOM.
    //
    // A STRING `as` is a WEB refinement only: an intrinsic tag has no
    // meaning on native, so there the element falls back to a primitive —
    // the declared `$$type` first, else what the tag itself implies
    // (`as="h2"` is a text element → Text; see TYPE_BY_TAG), else View.
    // Behavior is never inferred: press/input semantics need an explicit
    // interactive `$$type`. A COMPONENT `as` renders on every platform —
    // the component is expected to be universal or platform-split itself.
    if (props?.['as'] !== undefined) {
      const { as, ...rest } = props
      if (typeof as === 'string' && config.platform === 'native') {
        const native = resolveElement(type ?? TYPE_BY_TAG[as] ?? 'view')
        return createElement(native as never, bag.with(rest))
      }
      return createElement(as as never, bag.with(rest))
    }
    // No `as`, no `$$type`: the default element is a View — the universal
    // box. `'view'` is resolved here, not left to each host's resolver, so
    // the default is part of the core contract.
    if (El === undefined) El = resolveElement(type ?? 'view')
    const merged = props ? bag.with(props) : bag
    return createElement(El as never, merged)
  }

  // Runtime container roots (mediaMode 'runtime', an element declaring
  // `container: '<name>'`): the component measures its own inline size
  // through the platform's `measureContainerProps` seam and provides the
  // sizes map to its subtree, shadowing an outer same-name container —
  // the runtime mirror of the `@container` nearest-ancestor lookup. In css
  // mode the generated toggles carry all of this, so the plain component
  // renders with zero extra hooks. Container-ness is static in the rules,
  // so each element key takes ONE of these branches for its whole life.
  const containerOf =
    config.mediaMode === 'runtime'
      ? (
          getInstance() as Instance & {
            containerName?: (k: string) => string | undefined
          }
        ).containerName?.(key)
      : undefined

  const Comp = (
    containerOf === undefined
      ? RenderCore
      : (props?: AnyProps): ReactElement => {
          const parentSizes = useContext(ContainerSizesContext)
          const [width, setWidth] = useState(0)
          const sizes = useMemo(
            () => ({ ...parentSizes, [containerOf]: width }),
            [parentSizes, width],
          )
          // setWidth is stable and the config seam is read once: the
          // measure props keep one identity for the element's life.
          // biome-ignore lint/correctness/useExhaustiveDependencies: intentionally once
          const measureProps = useMemo(
            () => config.measureContainerProps?.(w => setWidth(prev => (prev === w ? prev : w))),
            [config],
          )
          const children = createElement(
            ContainerSizesContext.Provider,
            { value: sizes },
            props?.['children'] as never,
          )
          return createElement<AnyProps>(RenderCore, { ...props, ...measureProps, children })
        }
  ) as BoundElement
  return Comp
}

/** Publish compatibility accessors only from a commit (or module-level bind). */
export function reflectBags(map: Record<string, BoundElement>, instance: Instance): void {
  for (const key in map) {
    const comp = map[key]!
    const bag = instance[key]!
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
  const map = buildBoundMap(() => instance, (instance as AnyProps)['config'] ?? config)
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
  const instance = (useStyles as unknown as (s: StylesheetLike, m?: AnyProps) => Instance)(
    styles,
    mods[0],
  )

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
      listener => {
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
  for (const { key } of instance.elementDescriptors()) props[key] = instance[key]!
  return {
    ...store.map,
    $props: props as any,
    $scope: ((children: ReactNode) =>
      createElement(store.context.Provider, { value: instance }, children)) as any,
  }
}
