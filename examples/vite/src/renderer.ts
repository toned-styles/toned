import '@toned/themes/shadcn/config.css'
import 'virtual:toned.css'
import { ui } from '@examples/shared'
import { createWebRenderer } from '@toned/core/server'
import manifest from 'virtual:toned.manifest'

/** Class names from the generated CSS, validated against its manifest. */
export const renderer = createWebRenderer(ui, { manifest })
