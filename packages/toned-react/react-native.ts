/** Legacy configuration entry. New integrations import hosts/native. */
import { defineConfig } from '@toned/core'
import { nativeBackend } from '@toned/core/backends'
import reactConfig from './config.native.ts'
import { nativeHost } from './hosts/native.ts'

export default defineConfig({
  ...reactConfig,
  ...nativeHost,
  initRef: reactConfig.initRef,
  initInteraction: reactConfig.initInteraction,
  backend: nativeBackend,
})
