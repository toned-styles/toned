import type { Variants } from '@toned/core'
import { useStyles } from '@toned/react'
import { stylesheet } from '@toned/systems/base'
import type * as React from 'react'

export const textareaStyles = stylesheet({
  root: {
    display: 'block',
    bgColor: 'default',
    textColor: 'default',
    borderColor: 'input',
    borderWidth: 'thin',
    borderRadius: 'medium',
    width: '100%',
    minHeight: '5rem',
    paddingX: 3,
    paddingY: 2,
    // 16px on small screens, so iOS does not zoom the page on focus.
    typo: 'body_medium',
    '@md': { typo: 'body_small' },
    shadow: 'small',
    // No tokens: the field grows with its content and resizes vertically.
    style: {
      fieldSizing: 'content',
      resize: 'vertical',
      transition: 'border-color 0.15s, box-shadow 0.15s',
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

function Textarea({
  className,
  disabled,
  ...props
}: React.ComponentProps<'textarea'>) {
  const invalid = props['aria-invalid']
  const s = useStyles(textareaStyles, {
    disabled: !!disabled,
    invalid: invalid === true || invalid === 'true',
  })

  return (
    <textarea
      data-slot="textarea"
      {...s.root.with({ className })}
      disabled={disabled}
      {...props}
    />
  )
}

export { Textarea }
