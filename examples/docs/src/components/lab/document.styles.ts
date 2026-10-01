import type { Variants } from '@toned/core'

import { stylesheet } from './document.system.ts'

export const documentSheet = stylesheet({
  Root: {
    $kind: 'text',
    padding: 24,
    surface: 'tint',
    radius: 12,
    text: 'body',
  },
}).variants(($: Variants<{ compact: boolean }>) => ({
  [$.compact(true)]: { Root: { padding: 16 } },
}))
