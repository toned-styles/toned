import type { Variants } from '@toned/core'
import { stylesheet } from '../system.ts'

/** A titled container. */
export const panelStyles = stylesheet({
  Root: {
    flow: 'column',
    fill: 'raised',
    edge: 'panel',
    corner: 'panel',
    depth: 'panel',
    frost: 'surface',
    overflow: 'clip',
  },
  Head: {
    flow: 'wrap',
    align: 'center',
    justify: 'between',
    gap: 2,
    padX: 4,
    padY: 3,
    fill: 'head',
    ink: 'on-head',
    edge: 'rule',
  },
  Title: { $kind: 'text', type: 'title' },
  Body: { flow: 'column', gap: 4, pad: 4 },
})

/** One figure with its label, change and trend line. */
export const statStyles = stylesheet({
  Root: {
    flow: 'column',
    gap: 1,
    pad: 4,
    fill: 'raised',
    edge: 'panel',
    corner: 'panel',
    depth: 'panel',
    frost: 'surface',
  },
  Label: { $kind: 'text', type: 'label', ink: 'muted' },
  Row: { flow: 'row', align: 'baseline', justify: 'between', gap: 2 },
  Value: { $kind: 'text', type: 'display', ink: 'strong' },
  Trend: { flow: 'block', ink: 'accent', flex: 'full' },
})

export const badgeStyles = stylesheet({
  Root: {
    $kind: 'text',
    flow: 'inline',
    align: 'center',
    padX: 2,
    padY: 0.5,
    overflow: 'nowrap',
    type: 'label',
    fill: 'track',
    ink: 'default',
    corner: 'pill',
  },
}).variants(
  ($: Variants<{ tone: 'ok' | 'warn' | 'bad' | 'neutral' }>) => ({
    [$.tone('ok')]: { Root: { fill: 'ok', ink: 'on-ok' } },
    [$.tone('warn')]: { Root: { fill: 'warn', ink: 'on-warn' } },
    [$.tone('bad')]: { Root: { fill: 'bad', ink: 'on-bad' } },
    [$.tone('neutral')]: { Root: { fill: 'neutral', ink: 'on-neutral' } },
  }),
  { defaults: { tone: 'neutral' } },
)

export const tableStyles = stylesheet({
  Scroll: { overflow: 'scroll-x' },
  Table: { reset: 'table', type: 'body' },
  HeadCell: {
    $kind: 'text',
    padX: 2,
    padY: 2,
    overflow: 'nowrap',
    textAlign: 'left',
    type: 'label',
    ink: 'muted',
    edge: 'rule',
    '@media md': { padX: 4 },
  },
  Row: { motion: 'themed', ':hover': { fill: 'hover' } },
  Cell: { padX: 2, padY: 2, edge: 'rule', '@media md': { padX: 4 } },
  Version: { $kind: 'text', type: 'data', weight: 'strong', ink: 'strong' },
  Owner: { flow: 'row', align: 'center', gap: 2, overflow: 'nowrap' },
  Rollout: { flow: 'row', align: 'center', gap: 2 },
  // The bar needs room a narrow screen does not have; the figure stays.
  Gauge: { flow: 'hidden', flex: 'fill', '@media md': { flow: 'row' } },
  Percent: {
    $kind: 'text',
    type: 'data',
    measure: 'percent',
    textAlign: 'right',
  },
}).variants(
  ($: Variants<{ column: 'always' | 'wide' }>) => ({
    // Columns a narrow screen can do without.
    [$.column('wide')]: {
      HeadCell: { flow: 'hidden', '@media md': { flow: 'cell' } },
      Cell: { flow: 'hidden', '@media md': { flow: 'cell' } },
    },
  }),
  { defaults: { column: 'always' } },
)

/** A progress bar. The component sets the bar's width: it is data. */
export const meterStyles = stylesheet({
  Track: {
    flow: 'block',
    flex: 'fill',
    measure: 'meter',
    size: 'meter',
    fill: 'track',
    corner: 'pill',
    overflow: 'clip',
  },
  Bar: {
    flow: 'block',
    flex: 'tall',
    fill: 'meter',
    corner: 'pill',
    motion: 'themed',
  },
})

export const avatarStyles = stylesheet({
  Group: { flow: 'row', align: 'center' },
  Root: {
    $kind: 'text',
    flow: 'inline',
    align: 'center',
    justify: 'center',
    size: 'avatar',
    type: 'label',
    fill: 'selected',
    ink: 'on-selected',
    edge: 'cutout',
    corner: 'pill',
  },
}).variants(($: Variants<{ stacked: boolean }>) => ({
  [$.stacked(true)]: { Root: { overlap: 'avatar' } },
}))

/** A bar chart drawn in SVG; the bars take the part's colour. */
export const chartStyles = stylesheet({
  Root: { flow: 'block', flex: 'full', measure: 'chart', ink: 'accent' },
  Axis: { flow: 'row', justify: 'between', type: 'small', ink: 'muted' },
})

export const feedStyles = stylesheet({
  List: { reset: 'list', flow: 'column', pad: 0 },
  Item: {
    flow: 'row',
    align: 'center',
    justify: 'between',
    gap: 3,
    padY: 2,
    edge: 'rule',
  },
  Entry: { flow: 'row', align: 'center', gap: 2, flex: 'fill' },
  Time: { $kind: 'text', type: 'small', ink: 'muted', overflow: 'nowrap' },
})
