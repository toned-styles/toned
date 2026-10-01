import type { ComponentProps, ComponentType, ReactNode } from 'react'

export interface ComponentEntry<
  C extends ComponentType<any> = ComponentType<any>,
> {
  name: string
  component: C
  defaultProps: Partial<ComponentProps<C>>
}

/** The documented components a preview receives, keyed by export name. */
export type DocParts = Record<string, ComponentType<any>>

export interface DocDescriptor {
  description?: string
  entries: ComponentEntry[]
  preview?: (components: DocParts) => ReactNode
}

export function c<C extends ComponentType<any>>(
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
