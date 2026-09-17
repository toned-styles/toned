import type { ElementType, HostConditions } from '@toned/core'
import type { Base } from '@toned/core/stylesheet'
import { createElement, useContext, useLayoutEffect, useMemo } from 'react'
import { ContainerSizesStore } from './container-store.ts'
import { ContainerSizesContext, ContainerStoreContext } from './containers.tsx'
import { addWith } from './host-props.ts'
import { elementProps } from './style-view.ts'

// Host props are platform-dependent; the public callable checks explicit `as`.
// biome-ignore lint/suspicious/noExplicitAny: adapter boundary
export type HostProps = Record<string, any>

type PartHostProps = {
  instance: Base
  part: string
  props: HostProps
  conditions?: HostConditions
}
type ResolvedPartHostProps = PartHostProps & { target: unknown }

/** Shared host rendering for every binding surface. No component factory runs
 * during render, and no host configuration is captured at module evaluation. */
export function PartHost(input: PartHostProps) {
  const legacy = useContext(ContainerSizesContext)
  const scope = useContext(ContainerStoreContext)
  const runtime = input.instance.config.mediaMode === 'runtime'
  const conditions = useMemo<HostConditions | undefined>(() => {
    if (!runtime || (!scope && !Object.keys(legacy).length)) return undefined
    return {
      readSizes: () => ({
        ...scope?.store.snapshot(),
        ...(scope?.legacy === legacy ? {} : legacy),
      }),
      subscribe: (listener) => scope?.store.subscribe(listener) ?? (() => {}),
    }
  }, [runtime, scope, legacy])
  const { resolveElement, platform } = input.instance.config
  const kind = input.instance.elementKind(input.part)
  const as = input.props['as']
  const target = useMemo(() => {
    if (typeof resolveElement !== 'function')
      throw new Error(
        'Toned elements require a host config with resolveElement; install @toned/react/react-web or a native host adapter',
      )
    return as === undefined
      ? resolveElement(kind ?? 'view')
      : typeof as === 'string' && platform === 'native'
        ? resolveElement(kind ?? TYPE_BY_TAG[as] ?? 'view')
        : as
  }, [resolveElement, platform, kind, as])
  const hostInput = { ...input, conditions, target }
  const name =
    input.instance.config.mediaMode === 'runtime'
      ? input.instance.containerName(input.part)
      : undefined
  return name === undefined
    ? renderHost(hostInput)
    : createElement(MeasuredPartHost, { ...hostInput, name })
}

function renderHost({
  instance,
  part,
  props,
  conditions,
  target,
}: ResolvedPartHostProps) {
  const { as: _as, ...rest } = props
  const bag = elementProps(instance, part, conditions) as {
    with: (props: HostProps) => HostProps
  }
  return createElement(target as never, bag.with(rest))
}

/** Container measurement updates a stable store directly, without rerendering
 * the subtree. Its lifecycle and host props are shared by old and new bindings. */
function MeasuredPartHost({
  instance,
  part,
  props,
  conditions,
  name,
  target,
}: ResolvedPartHostProps & { name: string }) {
  const legacy = useContext(ContainerSizesContext)
  const parent = useContext(ContainerStoreContext)
  const measurement = useMemo(
    () => new ContainerSizesStore(undefined, { [name]: 0 }),
    [name],
  )
  const scope = useMemo(
    () => ({
      store: new ContainerSizesStore(parent?.store, {
        ...(parent?.legacy === legacy ? {} : legacy),
        [name]: measurement.snapshot()[name]!,
      }),
      legacy,
    }),
    [parent, legacy, measurement, name],
  )
  useLayoutEffect(() => {
    const sync = () => scope.store.set(name, measurement.snapshot()[name]!)
    const stop = measurement.subscribe(sync)
    sync()
    return stop
  }, [scope, measurement, name])
  const measure = instance.config.measureContainerProps
  const measureProps = useMemo(
    () => measure?.((width) => measurement.set(name, width)),
    [measure, measurement, name],
  )
  const merged = addWith({ ...measureProps })['withProps'](props)
  return renderHost({
    instance,
    part,
    conditions,
    target,
    props: {
      ...merged,
      children: createElement(
        ContainerStoreContext.Provider,
        { value: scope },
        props['children'],
      ),
    },
  })
}
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
