import type { Variants } from '@toned/core'
import { useStyles } from '@toned/react'
import { stylesheet } from '@toned/systems/base'
import { RadioGroup as RadioGroupPrimitive } from 'radix-ui'
import type * as React from 'react'

export const radioGroupStyles = stylesheet({
  root: {
    display: 'grid',
    gap: 3,
  },
  item: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '1rem',
    height: '1rem',
    flexShrink: '0',
    bgColor: 'default',
    borderColor: 'input',
    borderWidth: 'thin',
    borderRadius: 'full',
    shadow: 'small',
    cursor: 'pointer',
    // No token: the transition list is specific to this control.
    style: { transition: 'border-color 0.15s, box-shadow 0.15s' },
    ':hover': { borderColor: 'action' },
    ':focus-visible': { shadow: 'focus' },
  },
  indicator: {
    display: 'block',
    width: '0.5rem',
    height: '0.5rem',
    borderRadius: 'full',
    bgColor: 'action',
  },
}).variants(
  ($: Variants<{ disabled: boolean }>) => ({
    [$.disabled(true)]: {
      item: { cursor: 'not-allowed', opacity: 0.5 },
    },
  }),
  { defaults: { disabled: false } },
)

function RadioGroup({
  className,
  ...props
}: React.ComponentProps<typeof RadioGroupPrimitive.Root>) {
  const s = useStyles(radioGroupStyles)

  return (
    <RadioGroupPrimitive.Root
      data-slot="radio-group"
      {...s.root.with({ className })}
      {...props}
    />
  )
}

function RadioGroupItem({
  className,
  disabled,
  ...props
}: React.ComponentProps<typeof RadioGroupPrimitive.Item>) {
  const s = useStyles(radioGroupStyles, { disabled: !!disabled })

  return (
    <RadioGroupPrimitive.Item
      data-slot="radio-group-item"
      {...s.item.with({ className })}
      disabled={disabled}
      {...props}
    >
      <RadioGroupPrimitive.Indicator
        data-slot="radio-group-indicator"
        {...s.indicator}
      />
    </RadioGroupPrimitive.Item>
  )
}

export { RadioGroup, RadioGroupItem }
