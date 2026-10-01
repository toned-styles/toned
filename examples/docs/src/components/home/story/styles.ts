import type { Variants } from '@toned/core'

import { stylesheet } from './system.ts'

type NoticeVariants = {
  tone: 'info' | 'success' | 'danger'
  size: 'regular' | 'compact'
}

export const noticeStyles = stylesheet({
  Root: { tint: 'info', shape: 'card', stack: 8 },
  Badge: { $kind: 'text', fill: 'info', shape: 'pill', text: 'label' },
  Title: { $kind: 'text', text: 'title' },
  Body: { $kind: 'text', text: 'body' },
}).variants(($: Variants<NoticeVariants>) => ({
  [$.tone('success')]: {
    Root: { tint: 'success' },
    Badge: { fill: 'success' },
  },
  [$.tone('danger')]: {
    Root: { tint: 'danger' },
    Badge: { fill: 'danger' },
  },
  [$.size('compact')]: {
    Root: { shape: 'compact', stack: 4 },
    Title: { text: 'body' },
  },
}))
