/** Legacy configuration entry. New integrations import hosts/web. */
import { defineConfig } from '@toned/core'
import reactConfig from './config.ts'
import { webHost } from './hosts/web.ts'

export default defineConfig({
  ...reactConfig,
  ...webHost,
  initRef: reactConfig.initRef,
  initInteraction: reactConfig.initInteraction,
})
