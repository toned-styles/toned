import { defineGrid, dp, fr, type Variants } from '@toned/core'
import {
  type AdaptiveLayoutName,
  defineAdaptiveLayout,
} from '@toned/core/adaptive'
import { stylesheet } from './system.ts'

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

const grid = defineGrid('lab-message', {
  columns: [dp(56), fr(1)],
  areas: [
    ['avatar', 'title'],
    ['.', 'body'],
  ],
  gap: 16,
})
const stacked = grid.variant({
  columns: [fr(1)],
  areas: [['avatar'], ['title'], ['body']],
  gap: 16,
})
export const gridStyles = stylesheet({
  Root: {
    '@platform web': { $grid: grid },
    fill: 'accent-soft',
    text: 'default',
    padding: 6,
    radius: '3xl',
  },
  Avatar: {
    $kind: 'text',
    '@platform web': { $area: grid.area('avatar') },
    fill: 'accent',
    text: 'on-accent',
    width: 12,
    height: 12,
    radius: '3xl',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  Title: {
    $kind: 'text',
    '@platform web': { $area: grid.area('title') },
    weight: 'heavy',
  },
  Body: { $kind: 'text', '@platform web': { $area: grid.area('body') } },
}).variants(($: Variants<{ stacked: boolean }>) => ({
  [$.stacked(true)]: { Root: { '@platform web': { $grid: stacked } } },
}))
