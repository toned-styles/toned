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
})

function Switch({
  className,
  size = "default",
  ...props
}: React.ComponentProps<typeof SwitchPrimitive.Root> & {
  size?: "sm" | "default"
}) {
  const s = useStyles(switchStyles)

  return (
    <SwitchPrimitive.Root
      data-slot="switch"
      data-size={size}
      {...s.root.with({ className })}
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
