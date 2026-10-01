import type { Variants } from '@toned/core'
import {
  type AdaptiveLayoutName,
  defineAdaptiveLayout,
} from '@toned/core/adaptive'
import { stylesheet } from '../../styles/system.ts'

export const adaptiveLayout = defineAdaptiveLayout({
  axis: 'layout',
  root: 'Root',
  areas: ['Title', 'Body', 'Actions'],
  fallback: 'stack',
  hysteresis: { size: 16, textScale: 0.1 },
  layouts: {
    stack: { flow: 'stack', gap: 16 },
    wide: {
      flow: 'row',
      gap: 20,
      when: { minWidth: 480, maxTextScale: 1.5 },
      areas: { Body: { grow: 1 } },
    },
  },
})

export const adaptiveStyles = stylesheet({
  Root: { fill: 'accent-soft', text: 'default', padding: 5, radius: '3xl' },
  Title: { $kind: 'text', weight: 'heavy' },
  Body: { $kind: 'text', minWidth: 0 },
  Actions: { $kind: 'text', weight: 'heavy', text: 'accent' },
}).variants(
  ($: Variants<{ layout: AdaptiveLayoutName<typeof adaptiveLayout> }>) =>
    adaptiveLayout.rules($),
  { defaults: { layout: adaptiveLayout.fallback } },
)
