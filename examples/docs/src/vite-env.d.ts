/// <reference types="vite/client" />

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

  export interface SheetSource {
    name: string
    source: string
    parts: string[]
  }
  export const source: string
  export const sheets: SheetSource[]
  const docs: ComponentDoc[]
  export default docs
}

declare module 'virtual:component-docs/index' {
  import type { ComponentDoc } from 'virtual:component-docs/*'

  export const names: string[]
  export const loaders: Record<
    string,
    () => Promise<{
      default: ComponentDoc[]
      source: string
      sheets: import('virtual:component-docs/*').SheetSource[]
    }>
  >
}

declare module 'virtual:toned.manifest' {
  const manifest: import('@toned/core/build').BuildManifest
  export default manifest
}
