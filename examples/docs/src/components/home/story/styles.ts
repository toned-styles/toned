import type { Variants } from '@toned/core'
import { stylesheet } from './system.ts'

type NoticeVariants = {
  tone: 'info' | 'success' | 'danger'
  size: 'regular' | 'compact'
}

export const noticeStyles = stylesheet({
  Root: { stack: 8, inset: 'card', corner: 12, surface: 'info', edge: 'info' },
  Badge: {
    $kind: 'text',
    type: 'label',
    inset: 'badge',
    corner: 999,
    surface: 'info-solid',
    ink: 'on-solid',
  },
  Title: { $kind: 'text', type: 'title', ink: 'strong' },
  Body: { $kind: 'text', type: 'body', ink: 'body' },
}).variants(($: Variants<NoticeVariants>) => ({
  [$.tone('success')]: {
    Root: { surface: 'success', edge: 'success' },
    Badge: { surface: 'success-solid' },
  },
  [$.tone('danger')]: {
    Root: { surface: 'danger', edge: 'danger' },
    Badge: { surface: 'danger-solid' },
  },
  [$.size('compact')]: {
    Root: { stack: 4, inset: 'card-compact' },
    Title: { type: 'body' },
  },
}))
