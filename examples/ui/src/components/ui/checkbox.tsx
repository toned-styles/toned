"use client"

import * as React from "react"
import { CheckIcon } from "lucide-react"
import { Checkbox as CheckboxPrimitive } from "radix-ui"
import { useStyles } from "@toned/react"
import { stylesheet } from "@toned/systems/base"

const checkboxStyles = stylesheet({
  root: {
    borderColor: 'input',
    borderWidth: 'thin',
    width: '1rem',
    height: '1rem',
    flexShrink: '0',
    borderRadius: 'small',
    shadow: 'small',
    style: {
      outline: 'none',
      transition: 'box-shadow 0.15s',
    },
  },
  disabled: {
    cursor: 'not-allowed',
    opacity: 0.5,
  },
  indicator: {
    display: 'grid',
    style: {
      placeContent: 'center',
      color: 'currentColor',
      transition: 'none',
    },
  },
}).variants<{ checked: boolean }>(($) => ({
  [$.checked(true)]: {
    root: { bgColor: 'action', textColor: 'on_action', borderColor: 'action' },
  },
}))

function Checkbox({
  className,
  disabled,
  checked: checkedProp,
  defaultChecked,
  onCheckedChange,
  ...props
}: React.ComponentProps<typeof CheckboxPrimitive.Root>) {
  const [internal, setInternal] = React.useState<boolean | 'indeterminate'>(
    checkedProp ?? defaultChecked ?? false
  )
  const current = checkedProp ?? internal
  const isActive = current === true || current === 'indeterminate'

  const s = useStyles(checkboxStyles, { checked: isActive })

  return (
    <CheckboxPrimitive.Root
      data-slot="checkbox"
      checked={checkedProp}
      defaultChecked={defaultChecked}
      onCheckedChange={(val) => {
        setInternal(val)
        onCheckedChange?.(val)
      }}
      {...s.root.with(disabled && s.disabled).with({ className })}
      disabled={disabled}
      {...props}
    >
      <CheckboxPrimitive.Indicator
        data-slot="checkbox-indicator"
        {...s.indicator}
      >
        <CheckIcon className="size-3.5" />
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  )
}

export { Checkbox }
