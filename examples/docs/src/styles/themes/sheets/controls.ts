import type { Variants } from '@toned/core'
import { stylesheet } from '../system.ts'

/** A labelled text input or select. */
export const fieldStyles = stylesheet({
  Grid: { tracks: 'fields', gap: 4 },
  Root: { flow: 'column', gap: 1.5 },
  Label: { $kind: 'text', type: 'label', ink: 'default' },
  Hint: { $kind: 'text', type: 'small', ink: 'muted' },
  Control: { flow: 'block', place: 'origin' },
  Input: {
    reset: 'control',
    flex: 'full',
    size: 'control',
    padX: 3,
    type: 'body',
    fill: 'sunken',
    ink: 'strong',
    edge: 'field',
    corner: 'control',
    motion: 'themed',
    ':focus-visible': { focus: 'ring' },
  },
  Chevron: { flow: 'block', place: 'chevron', ink: 'muted' },
})

export const checkStyles = stylesheet({
  Root: {
    $kind: 'pressable',
    reset: 'control',
    flow: 'inline',
    align: 'center',
    gap: 2,
    pad: 0,
    textAlign: 'left',
    type: 'body',
    fill: 'none',
    ink: 'default',
    edge: 'none',
    corner: 'control',
    ':focus-visible': { focus: 'ring' },
  },
  Box: {
    flow: 'inline',
    align: 'center',
    justify: 'center',
    size: 'box',
    fill: 'sunken',
    ink: 'on-accent',
    edge: 'control',
    corner: 'control',
    depth: 'control',
    motion: 'themed',
  },
  Mark: { flow: 'hidden' },
}).variants(($: Variants<{ checked: boolean }>) => ({
  [$.checked(true)]: {
    Box: { fill: 'accent', edge: 'filled' },
    Mark: { flow: 'block' },
  },
}))

export const switchStyles = stylesheet({
  Root: {
    $kind: 'pressable',
    reset: 'control',
    flow: 'inline',
    align: 'center',
    gap: 2,
    pad: 0,
    textAlign: 'left',
    type: 'body',
    fill: 'none',
    ink: 'default',
    edge: 'none',
    corner: 'pill',
    ':focus-visible': { focus: 'ring' },
  },
  Track: {
    flow: 'inline',
    align: 'center',
    size: 'switch',
    padX: 1,
    fill: 'track',
    corner: 'pill',
    depth: 'control',
    motion: 'themed',
  },
  Thumb: {
    size: 'thumb',
    slide: 'off',
    fill: 'neutral',
    edge: 'control',
    corner: 'pill',
    motion: 'themed',
  },
}).variants(($: Variants<{ on: boolean }>) => ({
  [$.on(true)]: { Track: { fill: 'accent' }, Thumb: { slide: 'on' } },
}))

/** A radio group drawn as one segmented control. */
export const segmentStyles = stylesheet({
  Root: {
    flow: 'inline',
    gap: 0.5,
    pad: 0.5,
    fill: 'sunken',
    edge: 'field',
    corner: 'control',
  },
  Option: {
    $kind: 'pressable',
    reset: 'control',
    flow: 'inline',
    align: 'center',
    justify: 'center',
    flex: 'fill',
    padX: 3,
    padY: 1,
    overflow: 'nowrap',
    type: 'control',
    fill: 'none',
    ink: 'muted',
    edge: 'none',
    corner: 'control',
    motion: 'themed',
    ':hover': { ink: 'strong' },
    ':focus-visible': { focus: 'ring' },
  },
}).variants(($: Variants<{ selected: boolean }>) => ({
  [$.selected(true)]: {
    Option: {
      fill: 'selected',
      ink: 'on-selected',
      ':hover': { ink: 'on-selected' },
    },
  },
}))

export const sliderStyles = stylesheet({
  Row: { flow: 'row', align: 'center', gap: 3 },
  // `native: 'slider'` themes the track and thumb the browser draws.
  Input: {
    reset: 'control',
    native: 'slider',
    flex: 'fill',
    size: 'control',
    corner: 'control',
    ':focus-visible': { focus: 'ring' },
  },
  Value: { $kind: 'text', type: 'data', ink: 'strong', textAlign: 'right' },
})

export const tabStyles = stylesheet({
  List: { flow: 'row', gap: 1, padY: 1, overflow: 'scroll-x', edge: 'rule' },
  Tab: {
    $kind: 'pressable',
    reset: 'control',
    flow: 'inline',
    align: 'center',
    padX: 3,
    padY: 1.5,
    overflow: 'nowrap',
    type: 'control',
    fill: 'none',
    ink: 'muted',
    edge: 'none',
    corner: 'control',
    motion: 'themed',
    ':hover': { ink: 'strong' },
    ':focus-visible': { focus: 'ring' },
  },
  Panel: {
    flow: 'column',
    gap: 4,
    corner: 'control',
    ':focus-visible': { focus: 'ring' },
  },
}).variants(($: Variants<{ selected: boolean }>) => ({
  [$.selected(true)]: {
    Tab: {
      fill: 'selected',
      ink: 'on-selected',
      ':hover': { ink: 'on-selected' },
    },
  },
}))
