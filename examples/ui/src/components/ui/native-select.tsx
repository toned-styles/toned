import type { Variants } from '@toned/core'
import { useStyles } from '@toned/react'
import { stylesheet } from '@toned/systems/base'
import { ChevronDownIcon } from 'lucide-react'
import type * as React from 'react'

export const nativeSelectStyles = stylesheet({
  wrapper: {
    position: 'relative',
    width: 'fit-content',
  },
  select: {
    width: '100%',
    minWidth: 0,
    paddingLeft: 3,
    paddingRight: 9,
    bgColor: 'default',
    textColor: 'default',
    borderColor: 'input',
    borderWidth: 'thin',
    borderRadius: 'medium',
    typo: 'body_small',
    shadow: 'small',
    cursor: 'pointer',
    // No tokens: hides the browser's own arrow; the transition list is specific.
    style: {
      appearance: 'none',
      transition: 'border-color 0.15s, box-shadow 0.15s',
    },
    ':focus-visible': { borderColor: 'action', shadow: 'focus' },
  },
  icon: {
    textColor: 'muted',
    position: 'absolute',
    pointerEvents: 'none',
    top: '50%',
    right: 3,
    // No token for transforms: centres the icon on the field's height.
    style: { transform: 'translateY(-50%)' },
  },
}).variants(
  (
    $: Variants<{
      size: 'sm' | 'default'
      disabled: boolean
      invalid: boolean
    }>,
  ) => ({
    [$.size('default')]: { select: { height: '2.25rem' } },
    [$.size('sm')]: { select: { height: '2rem' } },
    [$.invalid(true)]: { select: { borderColor: 'destructive' } },
    [$.disabled(true)]: {
      select: { cursor: 'not-allowed', opacity: 0.5 },
    },
  }),
  { defaults: { size: 'default', disabled: false, invalid: false } },
)

function NativeSelect({
  className,
  size = 'default',
  disabled,
  ...props
}: Omit<React.ComponentProps<'select'>, 'size'> & { size?: 'sm' | 'default' }) {
  const invalid = props['aria-invalid']
  const s = useStyles(nativeSelectStyles, {
    size,
    disabled: !!disabled,
    invalid: invalid === true || invalid === 'true',
  })

  return (
    <div {...s.wrapper} data-slot="native-select-wrapper">
      <select
        data-slot="native-select"
        data-size={size}
        {...s.select.with({ className })}
        disabled={disabled}
        {...props}
      />
      <ChevronDownIcon
        {...s.icon}
        aria-hidden="true"
        data-slot="native-select-icon"
      />
    </div>
  )
}

function NativeSelectOption({ ...props }: React.ComponentProps<'option'>) {
  return <option data-slot="native-select-option" {...props} />
}

function NativeSelectOptGroup({ ...props }: React.ComponentProps<'optgroup'>) {
  return <optgroup data-slot="native-select-optgroup" {...props} />
}

export { NativeSelect, NativeSelectOptGroup, NativeSelectOption }
