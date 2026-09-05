import { createElement, useRef, type ReactElement } from 'react'
import { getConfig, SYMBOL_INIT, type Config, type ElementType } from '@toned/core'

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
