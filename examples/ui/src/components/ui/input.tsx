import type { Variants } from '@toned/core'
import { useStyles } from '@toned/react'
import { stylesheet } from '@toned/systems/base'
import type * as React from 'react'

export const inputStyles = stylesheet({
  root: {
    bgColor: 'default',
    textColor: 'default',
    borderColor: 'input',
    borderWidth: 'thin',
    borderRadius: 'medium',
    height: '2.25rem',
    width: '100%',
    minWidth: 0,
    paddingX: 3,
    paddingY: 1,
    // 16px on small screens, so iOS does not zoom the page on focus.
    typo: 'body_medium',
    '@media md': { typo: 'body_small' },
    shadow: 'small',
    // No token: the transition list is specific to this control.
    '@platform web': {
      $style: { transition: 'border-color 0.15s, box-shadow 0.15s' },
    },
    ':focus-visible': { borderColor: 'action', shadow: 'focus' },
  },
}).variants(
  ($: Variants<{ disabled: boolean; invalid: boolean }>) => ({
    [$.invalid(true)]: {
      root: { borderColor: 'destructive' },
    },
    [$.disabled(true)]: {
      root: { cursor: 'not-allowed', opacity: 0.5 },
    },
  }),
  { defaults: { disabled: false, invalid: false } },
)

function Input({
  className,
  type,
  disabled,
  ...props
}: React.ComponentProps<'input'>) {
  const invalid = props['aria-invalid']
  const s = useStyles(inputStyles, {
    disabled: !!disabled,
    invalid: invalid === true || invalid === 'true',
  })

  return (
    <input
      type={type}
      data-slot="input"
      {...s.root.with({ className })}
      disabled={disabled}
      {...props}
    />
  )
}

export { Input }
