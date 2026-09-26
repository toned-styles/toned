import { defineToken } from '@toned/core'

export const bgColor = defineToken({
  values: ['primary', 'quiet'] as const,
  resolve: (value) => ({
    backgroundColor: value === 'primary' ? '#123456' : '#eeeeee',
  }),
})
export const radius = defineToken({
  values: ['full', 'md'] as const,
  resolve: (value) => ({ borderRadius: value === 'full' ? 999 : 8 }),
})
