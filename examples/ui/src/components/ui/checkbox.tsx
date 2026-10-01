'use client'

import type { Variants } from '@toned/core'
import { useStyles } from '@toned/react'
import { stylesheet } from '@toned/systems/base'
import { CheckIcon, MinusIcon } from 'lucide-react'
import { Checkbox as CheckboxPrimitive } from 'radix-ui'
import * as React from 'react'

export const checkboxStyles = stylesheet({
  root: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '1rem',
    height: '1rem',
    flexShrink: '0',
    bgColor: 'default',
    borderColor: 'input',
    borderWidth: 'thin',
    borderRadius: 'small',
    shadow: 'small',
    cursor: 'pointer',
    // No token: the transition list is specific to this control.
    style: {
      transition:
        'background-color 0.15s, border-color 0.15s, box-shadow 0.15s',
    },
    ':hover': { borderColor: 'action' },
    ':focus-visible': { shadow: 'focus' },
  },
  indicator: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: {
    width: '0.75rem',
    height: '0.75rem',
    // No token: a heavier stroke keeps the mark legible at 12px.
    style: { strokeWidth: 3 },
  },
}).variants(
  ($: Variants<{ checked: boolean; disabled: boolean }>) => ({
    [$.checked(true)]: {
      root: {
        bgColor: 'action',
        textColor: 'on_action',
        borderColor: 'action',
      },
    },
    [$.disabled(true)]: {
      root: { cursor: 'not-allowed', opacity: 0.5 },
    },
  }),
  { defaults: { checked: false, disabled: false } },
)

function Checkbox({
  className,
  disabled,
  checked: checkedProp,
  defaultChecked,
  onCheckedChange,
  ...props
}: React.ComponentProps<typeof CheckboxPrimitive.Root>) {
  const [internal, setInternal] = React.useState<boolean | 'indeterminate'>(
    checkedProp ?? defaultChecked ?? false,
  )
  const current = checkedProp ?? internal
  const isActive = current === true || current === 'indeterminate'

  const s = useStyles(checkboxStyles, {
    checked: isActive,
    disabled: !!disabled,
  })
  const Mark = current === 'indeterminate' ? MinusIcon : CheckIcon

  return (
    <CheckboxPrimitive.Root
      data-slot="checkbox"
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
      <CheckboxPrimitive.Indicator
        data-slot="checkbox-indicator"
        {...s.indicator}
      >
        <Mark {...s.icon} />
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  )
}

export { Checkbox }
