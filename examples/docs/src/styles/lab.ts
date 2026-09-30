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
  Root: {
    $style: { padding: 20, borderRadius: 16, backgroundColor: '#eef2ff' },
  },
  Title: { $kind: 'text', $style: { fontWeight: '700' } },
  Body: { $kind: 'text', $style: { minWidth: 0 } },
  Actions: { $kind: 'text', $style: { fontWeight: '700', color: '#284bdd' } },
}).variants(
  ($: Variants<{ layout: AdaptiveLayoutName<typeof adaptiveLayout> }>) =>
    adaptiveLayout.rules($),
  { defaults: { layout: adaptiveLayout.fallback } },
)

export const motionStyles = stylesheet({
  Root: {
    $style: {
      width: 72,
      height: 72,
      borderRadius: 16,
      backgroundColor: '#7040cb',
      opacity: 1,
    },
  },
}).variants(($: Variants<{ expanded: boolean }>) => ({
  [$.expanded(true)]: { Root: { $style: { width: 240, borderRadius: 36 } } },
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
    $style: { padding: 24, borderRadius: 16, backgroundColor: '#eef2ff' },
  },
  Avatar: {
    $kind: 'text',
    '@platform web': { $area: grid.area('avatar') },
    $style: {
      width: 48,
      height: 48,
      borderRadius: 16,
      backgroundColor: '#284bdd',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    },
  },
  Title: {
    $kind: 'text',
    '@platform web': { $area: grid.area('title') },
    $style: { fontWeight: '700' },
  },
  Body: { $kind: 'text', '@platform web': { $area: grid.area('body') } },
}).variants(($: Variants<{ stacked: boolean }>) => ({
  [$.stacked(true)]: { Root: { '@platform web': { $grid: stacked } } },
}))
