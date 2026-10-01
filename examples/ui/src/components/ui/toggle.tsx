'use client'

import type { Variants } from '@toned/core'

import { useStyles } from '@toned/react'
import { stylesheet } from '@toned/systems/base'
import { Toggle as TogglePrimitive } from 'radix-ui'
import * as React from 'react'

const toggleStyles = stylesheet({
  root: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    flexShrink: '0',
    borderRadius: 'medium',
    typo: 'label_small',
    textColor: 'default',
    cursor: 'pointer',
    // No tokens for text wrapping or transitions.
    style: {
      whiteSpace: 'nowrap',
      transition: 'color 0.15s, background-color 0.15s, box-shadow 0.15s',
    },
    ':hover': { bgColor: 'subtle' },
    ':focus-visible': { shadow: 'focus' },
  },
}).variants(
  (
    $: Variants<{
      variant: 'default' | 'outline'
      size: 'default' | 'sm' | 'lg'
      pressed: boolean
      disabled: boolean
    }>,
  ) => ({
    [$.variant('outline')]: {
      root: {
        bgColor: 'default',
        borderColor: 'input',
        borderWidth: 'thin',
        shadow: 'small',
      },
    },
    [$.size('default')]: {
      root: { height: '2.25rem', minWidth: '2.25rem', paddingX: 2.5 },
    },
    [$.size('sm')]: {
      root: { height: '2rem', minWidth: '2rem', paddingX: 2 },
    },
    [$.size('lg')]: {
      root: { height: '2.5rem', minWidth: '2.5rem', paddingX: 3 },
    },
    [$.pressed(true)]: {
      root: {
        bgColor: 'action_secondary',
        textColor: 'on_action_secondary',
        ':hover': { bgColor: 'action_secondary' },
      },
    },
    [$.disabled(true)]: {
      root: { pointerEvents: 'none', opacity: 0.5 },
    },
  }),
  {
    defaults: {
      variant: 'default',
      size: 'default',
      pressed: false,
      disabled: false,
    },
  },
)

function Toggle({
  className,
  disabled,
  variant = 'default',
  size = 'default',
  pressed: pressedProp,
  defaultPressed,
  onPressedChange,
  ...props
}: React.ComponentProps<typeof TogglePrimitive.Root> & {
  variant?: 'default' | 'outline'
  size?: 'default' | 'sm' | 'lg'
}) {
  const [internal, setInternal] = React.useState(
    pressedProp ?? defaultPressed ?? false,
  )
  const pressed = pressedProp ?? internal

  const s = useStyles(toggleStyles, {
    variant,
    size,
    pressed,
    disabled: !!disabled,
  })

  return (
    <TogglePrimitive.Root
      data-slot="toggle"
      pressed={pressedProp}
      defaultPressed={defaultPressed}
      onPressedChange={(val) => {
        setInternal(val)
        onPressedChange?.(val)
      }}
      {...s.root.with({ className })}
      disabled={disabled}
      {...props}
    />
  )
}

export { Toggle, toggleStyles }
