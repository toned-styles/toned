import { defineSystem } from '@toned/core'
import { bgColor, radius } from './tokens'

export const ui = defineSystem({
  id: 'editor-fixture',
  tokens: { bgColor, radius },
})
