import type { Variants } from '@toned/core'

import { stylesheet } from '../../styles/system.ts'

export const motionStyles = stylesheet({
  Root: {
    // The studio palette: `accent` names it, `surface` paints with it.
    accent: 'violet',
    surface: 'accent',
    width: 18,
    height: 18,
    radius: '3xl',
    opacity: 1,
  },
}).variants(($: Variants<{ expanded: boolean }>) => ({
  [$.expanded(true)]: { Root: { width: 60, radius: '5xl' } },
}))
