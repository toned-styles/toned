import { createElement, useRef, type ReactElement } from 'react'
import { getConfig, SYMBOL_INIT, type Config, type ElementType } from '@toned/core'
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

type Instance = Record<string, Bag> & {
  elementDescriptors: () => Array<{ key: string; type?: ElementType }>
}

// biome-ignore lint/suspicious/noExplicitAny: matches StylesheetLike in index.ts.
type StylesheetLike = { [SYMBOL_INIT]: (...args: any[]) => any }

/**
 * Build one stable component per element, over a getter for the CURRENT
 * resolution. Shared by `bind` (fixed instance) and `useBind` (a ref updated
 * each render), so mods flow anew without remounting: identities are created
 * here once, never per render.
 */
export function buildBoundMap(
  getInstance: () => Instance,
  config: Config,
): Record<string, BoundElement> {
  const resolveElement = config.resolveElement
  if (typeof resolveElement !== 'function') {
    throw new Error(
      'useBind/bind require a config with resolveElement — install @toned/react/react-web ' +
        '(or a host config that sets resolveElement). @toned/react/config alone has none.',
    )
  }

  const map: Record<string, BoundElement> = {}
  for (const { key, type } of getInstance().elementDescriptors()) {
    // Resolve the host element LAZILY, on first render, not here. `resolveElement`
    // can throw (the native seam does until a host installs one), and building
    // the map runs at module import for `bind()`; a throw there would fault an
    // import from a component nobody rendered. Deferring it to render keeps the
    // component identity stable (identity is `Comp`, cached once — not `El`).
    let El: unknown
    const Comp = ((props?: AnyProps): ReactElement => {
      // `key` is a declared element, so the getter never yields undefined.
      const bag = getInstance()[key]!
      // `as` overrides the `$$type`-selected primitive for this render: the
      // element renders exactly that component/intrinsic, with every other
      // prop merged through the same with() path. It never reaches the DOM.
      if (props?.['as'] !== undefined) {
        const { as, ...rest } = props
        return createElement(as as never, bag.with(rest))
      }
      if (El === undefined) El = resolveElement(type)
      const merged = props ? bag.with(props) : bag
      return createElement(El as never, merged)
    }) as BoundElement
    map[key] = Comp
  }
  return map
}

/**
 * Reflect the current render's raw prop-bag onto each bound component, so the
 * escape-hatch accessors (`s.Root.with`, `.style`, `.className`, handlers) read
 * this render's values. `with` is non-enumerable on the bag, so Object.assign
 * (enumerable-only) misses it — it is re-bound explicitly.
 */
export function reflectBags(map: Record<string, BoundElement>, instance: Instance): void {
  for (const key in map) {
    const comp = map[key]!
    const bag = instance[key]!
    Object.assign(comp, bag)
    comp.with = bag.with
  }
}

/**
 * Mod-less module-level binding: `const { Root, Label } = bind(styles)`.
 * Resolves once with the current global config; no hook, no mods.
 */
export function bind(styles: StylesheetLike): Record<string, BoundElement> {
  const config = getConfig()
  const instance = styles[SYMBOL_INIT](config, undefined) as Instance
  const map = buildBoundMap(() => instance, config)
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
  // useStyles owns the resolution + its applyState guard; its result IS the
  // Base instance (element getters + elementDescriptors) at runtime.
  const instance = (useStyles as (s: StylesheetLike, m?: AnyProps) => Instance)(styles, mods[0])

  const liveInstance = useRef(instance)
  liveInstance.current = instance

  const mapRef = useRef<{ styles: StylesheetLike; map: Record<string, BoundElement> } | null>(null)
  if (mapRef.current?.styles !== styles) {
    mapRef.current = {
      styles,
      map: buildBoundMap(() => liveInstance.current, getConfig()),
    }
  }
  reflectBags(mapRef.current.map, instance)
  return mapRef.current.map
}
