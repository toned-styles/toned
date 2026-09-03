import { createElement, type ReactElement } from 'react'
import { getConfig, SYMBOL_INIT, type Config, type ElementType } from '@toned/core'

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
    const El = resolveElement(type)
    const Comp = ((props?: AnyProps): ReactElement => {
      // `key` is a declared element, so the getter never yields undefined.
      const bag = getInstance()[key]!
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
