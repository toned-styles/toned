import type { ComponentType, ComponentProps, ReactNode } from 'react'

export interface ComponentEntry<C extends ComponentType<any> = ComponentType<any>> {
  name: string
  component: C
  defaultProps: Partial<ComponentProps<C>>
}

export interface DocDescriptor {
  entries: ComponentEntry[]
  preview?: (components: Record<string, ComponentType<any>>) => ReactNode
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
  components: ComponentEntry[]
  preview?: (components: Record<string, ComponentType<any>>) => ReactNode
}): DocDescriptor {
  return {
    entries: config.components,
    preview: config.preview,
  }
}
