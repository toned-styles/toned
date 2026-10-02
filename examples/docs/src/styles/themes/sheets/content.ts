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
  Body: { flow: 'column', gap: 5, pad: 4 },
  Foot: {
    flow: 'wrap',
    align: 'center',
    justify: 'between',
    gap: 3,
    padX: 4,
    padY: 3,
    edge: 'rule-top',
  },
})

/** One figure with its label, its change and a small chart of its trend. */
export const statStyles = stylesheet({
  Root: {
    flow: 'column',
    gap: 2,
    pad: 4,
    fill: 'raised',
    edge: 'panel',
    corner: 'panel',
    depth: 'panel',
  },
  Label: { $kind: 'text', type: 'label', ink: 'muted' },
  Row: { flow: 'row', align: 'end', justify: 'between', gap: 3 },
  Value: { $kind: 'text', type: 'display', ink: 'strong', overflow: 'nowrap' },
  Change: { flow: 'row', align: 'center', gap: 2 },
  Note: { $kind: 'text', type: 'small', ink: 'muted' },
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
    corner: 'badge',
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
    padX: 3,
    padY: 2,
    overflow: 'nowrap',
    textAlign: 'left',
    type: 'label',
    fill: 'head',
    ink: 'on-head',
    '@media md': { padX: 4 },
  },
  Row: { motion: 'themed', ':hover': { fill: 'hover' } },
  // Ruled above, so the last row does not double the panel's own edge.
  Cell: { padX: 3, padY: 2, edge: 'rule-top', '@media md': { padX: 4 } },
  Version: { $kind: 'text', type: 'data', weight: 'strong', ink: 'strong' },
  Branch: { $kind: 'text', ink: 'muted', overflow: 'nowrap' },
  Owner: { flow: 'row', align: 'center', gap: 2, overflow: 'nowrap' },
  Rollout: { flow: 'row', align: 'center', gap: 3 },
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
    corner: 'pill',
  },
}).variants(
  ($: Variants<{ stacked: boolean }>) => ({
    // In a group each avatar is ringed, and overlaps the one before it.
    [$.stacked(true)]: { Root: { edge: 'cutout', overlap: 'avatar' } },
  }),
  { defaults: { stacked: false } },
)

/**
 * A bar chart. The component sets each bar's height: it is data. The newest
 * bar takes the accent.
 */
export const chartStyles = stylesheet({
  Root: { flow: 'row', align: 'end' },
  Bar: { flex: 'fill', fill: 'chart', corner: 'chart', motion: 'themed' },
  Axis: { flow: 'row', justify: 'between', type: 'small', ink: 'muted' },
}).variants(
  ($: Variants<{ size: 'full' | 'spark'; newest: boolean }>) => ({
    [$.size('full')]: {
      Root: { gap: 2, flex: 'full', measure: 'chart', edge: 'rule' },
    },
    // A small chart beside a figure.
    [$.size('spark')]: { Root: { gap: 0.5, size: 'spark' } },
    [$.newest(true)]: { Bar: { fill: 'accent' } },
  }),
  { defaults: { size: 'full', newest: false } },
)

export const feedStyles = stylesheet({
  List: { reset: 'list', flow: 'column', padX: 4, padY: 1 },
  Item: {
    flow: 'row',
    align: 'center',
    justify: 'between',
    gap: 3,
    padY: 3,
    edge: 'rule-top',
  },
  Entry: { flow: 'row', align: 'center', gap: 3, flex: 'fill' },
  Time: { $kind: 'text', type: 'small', ink: 'muted', overflow: 'nowrap' },
}).variants(
  ($: Variants<{ first: boolean }>) => ({
    [$.first(true)]: { Item: { edge: 'none' } },
  }),
  { defaults: { first: false } },
)
