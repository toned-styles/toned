import type { Variants } from '@toned/core'

import { stylesheet } from '../system.ts'

/**
 * A button, written once. Nothing here names a theme: every value is a role
 * (`fill: 'accent'`, `edge: 'filled'`, `press: 'down'`) that the active theme
 * resolves.
 */
export const buttonStyles = stylesheet({
  Root: {
    $kind: 'pressable',
    reset: 'control',
    flow: 'inline',
    align: 'center',
    justify: 'center',
    gap: 2,
    size: 'control',
    padX: 4,
    overflow: 'nowrap',
    type: 'control',
    fill: 'accent',
    ink: 'on-accent',
    edge: 'filled',
    corner: 'control',
    depth: 'button',
    motion: 'themed',
    // Text the theme draws around the label, e.g. `[ Save ]`.
    affix: 'button',
    ':hover': { fill: 'accent-hover' },
    ':focus-visible': { focus: 'ring' },
    ':active': { press: 'down' },
  },
}).variants(
  (
    $: Variants<{
      tone: 'primary' | 'secondary' | 'danger' | 'quiet'
      shape: 'label' | 'icon'
      disabled: boolean
    }>,
  ) => ({
    [$.tone('secondary')]: {
      Root: {
        fill: 'neutral',
        ink: 'on-neutral',
        edge: 'control',
        ':hover': { fill: 'neutral-hover' },
      },
    },
    [$.tone('danger')]: {
      Root: {
        fill: 'danger',
        ink: 'on-danger',
        ':hover': { fill: 'danger-hover' },
      },
    },
    [$.tone('quiet')]: {
      Root: {
        fill: 'none',
        ink: 'default',
        edge: 'none',
        depth: 'none',
        ':hover': { fill: 'selected', ink: 'on-selected' },
      },
    },
    [$.shape('icon')]: { Root: { size: 'square', padX: 0 } },
    [$.disabled(true)]: { Root: { state: 'disabled' } },
  }),
  { defaults: { tone: 'primary', shape: 'label', disabled: false } },
)
