import type { Variants } from '@toned/core'

import { ui } from './system.ts'

type ButtonVariants = {
  size: 'm' | 's'
  variant: 'accent' | 'danger'
  alignment?: 'icon-only' | 'icon-left' | 'icon-right'
}

export const buttonStyles = ui
  .stylesheet((q) => ({
    Root: {
      $kind: 'pressable',
      borderRadius: 'medium',
      borderWidth: 'none',
      [q.platform('web')]: { $style: { cursor: 'pointer' } },
    },
    Label: { $kind: 'text' },
  }))
  .variants(($: Variants<ButtonVariants>, q) => ({
    [$.variant('accent')]: {
      Root: { bgColor: 'action' },
      Label: { textColor: 'on_action' },
      [q.part('Root').state('hover')]: {
        Root: { bgColor: 'action_secondary' },
        Label: { textColor: 'on_action_secondary' },
      },
    },
    [$.variant('danger')]: {
      Root: { bgColor: 'destructive' },
      Label: { textColor: 'on_destructive' },
    },
    [$.size('m')]: { Root: { paddingX: 3, paddingY: 2 } },
    [$.size('m').alignment('icon-only')]: { Root: { paddingX: 2 } },
    [$.size('s')]: { Root: { paddingX: 2, paddingY: 1 } },
    [$.size('s').alignment('icon-only')]: {
      Root: { paddingX: 1, paddingY: 2 },
    },
  }))
