import * as React from "react"
import { Switch as SwitchPrimitive } from "radix-ui"
import { useStyles } from "@toned/react"
import { stylesheet } from "@toned/systems/base"

const switchStyles = stylesheet({
  root: {
    display: 'inline-flex',
    flexShrink: '0',
    alignItems: 'center',
    borderRadius: 'full',
    shadow: 'small',
    style: {
      outline: 'none',
      border: '1px solid transparent',
      transition: 'all 0.15s',
    },
  },
  disabled: {
    cursor: 'not-allowed',
    opacity: 0.5,
  },
  thumb: {
    bgColor: 'default',
    pointerEvents: 'none',
    borderRadius: 'full',
    display: 'block',
    style: {
      boxShadow: 'none',
      transition: 'transform 0.15s',
    },
  },
}).variants<{ checked: boolean }>(($) => ({
  [$.checked(true)]: {
    root: { bgColor: 'action' },
  },
}))

function Switch({
  className,
  disabled,
  size = "default",
  checked: checkedProp,
  defaultChecked,
  onCheckedChange,
  ...props
}: React.ComponentProps<typeof SwitchPrimitive.Root> & {
  size?: "sm" | "default"
}) {
  const [internal, setInternal] = React.useState(checkedProp ?? defaultChecked ?? false)
  const checked = checkedProp ?? internal

  const s = useStyles(switchStyles, { checked })

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
      {...s.root.with(disabled && s.disabled).with({ className })}
      disabled={disabled}
      {...props}
    >
      <SwitchPrimitive.Thumb
        data-slot="switch-thumb"
        {...s.thumb}
      />
    </SwitchPrimitive.Root>
  )
}

export { Switch }
