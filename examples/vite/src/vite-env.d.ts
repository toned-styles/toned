/// <reference types="vite/client" />

declare module 'virtual:toned.manifest' {
  import type { BuildManifest } from '@toned/core/build'

  const manifest: BuildManifest
  export default manifest
}
