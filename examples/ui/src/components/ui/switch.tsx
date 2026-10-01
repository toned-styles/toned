import type { Variants } from '@toned/core'
import { useStyles } from '@toned/react'
import { stylesheet } from '@toned/systems/base'
import { Switch as SwitchPrimitive } from 'radix-ui'
import * as React from 'react'

export const switchStyles = stylesheet({
  root: {
    display: 'inline-flex',
    flexShrink: '0',
    alignItems: 'center',
    width: '2.25rem',
    height: '1.25rem',
    padding: 0.5,
    borderRadius: 'full',
    bgColor: 'interactive_muted',
    cursor: 'pointer',
    // No token: the transition list is specific to this control.
    style: { transition: 'background-color 0.15s, box-shadow 0.15s' },
    ':focus-visible': { shadow: 'focus' },
  },
  thumb: {
    display: 'block',
    width: '1rem',
    height: '1rem',
    bgColor: 'default',
    borderRadius: 'full',
    shadow: 'small',
    pointerEvents: 'none',
    // No token: the thumb slides when its inline-start margin changes, which
    // also mirrors it in right-to-left layouts.
    style: { transition: 'margin 0.15s' },
  },
}).variants(
  (
    $: Variants<{
      checked: boolean
      size: 'sm' | 'default'
      disabled: boolean
    }>,
  ) => ({
    [$.size('sm')]: {
      root: { width: '1.75rem', height: '1rem' },
      thumb: { width: '0.75rem', height: '0.75rem' },
    },
    [$.checked(true)]: {
      root: { bgColor: 'action' },
      thumb: { marginInlineStart: 4 },
    },
    [$.checked(true).size('sm')]: {
      thumb: { marginInlineStart: 3 },
    },
    [$.disabled(true)]: {
      root: { cursor: 'not-allowed', opacity: 0.5 },
    },
  }),
  { defaults: { checked: false, size: 'default', disabled: false } },
)

function Switch({
  className,
  disabled,
  size = 'default',
  checked: checkedProp,
  defaultChecked,
  onCheckedChange,
  ...props
}: React.ComponentProps<typeof SwitchPrimitive.Root> & {
  size?: 'sm' | 'default'
}) {
  const [internal, setInternal] = React.useState(
    checkedProp ?? defaultChecked ?? false,
  )
  const checked = checkedProp ?? internal

  const s = useStyles(switchStyles, { checked, size, disabled: !!disabled })

  return (
    <SwitchPrimitive.Root
      data-slot="switch"
      data-size={size}
      checked={checkedProp}
      defaultChecked={defaultChecked}
      onCheckedChange={(val) => {
        setInternal(val)
        onCheckedChange?.(val)
      }}
      {...s.root.with({ className })}
      disabled={disabled}
      {...props}
    >
      <SwitchPrimitive.Thumb data-slot="switch-thumb" {...s.thumb} />
    </SwitchPrimitive.Root>
  )
}

export { Switch }
