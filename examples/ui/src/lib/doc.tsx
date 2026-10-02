import type { ComponentProps, ComponentType, ReactNode } from 'react'

/**
 * Any documented component. Entries are heterogeneous, so the registry cannot
 * name one props type; `c()` checks each entry's props against its component.
 */
// oxlint-disable-next-line typescript/no-explicit-any -- component props are contravariant; `unknown` would reject every typed component
type AnyComponent = ComponentType<any>

export interface ComponentEntry<C extends AnyComponent = AnyComponent> {
  name: string
  component: C
  defaultProps: Partial<ComponentProps<C>>
}

/** The documented components a preview receives, keyed by export name. */
export type DocParts = Record<string, AnyComponent>

export interface DocDescriptor {
  description?: string
  entries: ComponentEntry[]
  preview?: (components: DocParts) => ReactNode
}

export function c<C extends AnyComponent>(
  ref: Record<string, C>,
  props: Partial<ComponentProps<C>>,
): ComponentEntry<C> {
  const name = Object.keys(ref)[0]
  const component = Object.values(ref)[0]
  return { name, component, defaultProps: props }
}

export function doc(config: {
  description?: string
  components: ComponentEntry[]
  preview?: (components: DocParts) => ReactNode
}): DocDescriptor {
  return {
    entries: config.components,
    description: config.description,
    preview: config.preview,
  }
}
