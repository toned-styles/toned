/// <reference types="vite/client" />

declare module '*.mdx' {
  import type { ComponentType } from 'react'
  const component: ComponentType
  export default component
}

declare module 'virtual:component-docs/*' {
  export interface PropDoc {
    name: string
    type: { name: string; value?: { value: string }[] }
    required: boolean
    defaultValue: { value: string } | null
    description: string
    preview?: string
  }

  export interface ComponentDoc {
    displayName: string
    description: string
    filePath: string
    props: Record<string, PropDoc>
  }

  const docs: ComponentDoc[]
  export default docs
}

declare module 'virtual:component-docs/index' {
  import type { ComponentDoc } from 'virtual:component-docs/*'

  export const names: string[]
  export const loaders: Record<
    string,
    () => Promise<{ default: ComponentDoc[] }>
  >
}
