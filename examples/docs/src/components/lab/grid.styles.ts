import { defineGrid, dp, fr, type Variants } from '@toned/core'

import { stylesheet } from '../../styles/system.ts'

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
