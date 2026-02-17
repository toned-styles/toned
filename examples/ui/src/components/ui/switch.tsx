import * as React from "react"
import { Switch as SwitchPrimitive } from "radix-ui"
import { useStyles } from "@toned/react"
import { stylesheet } from "@toned/systems/base"

import { cn } from "@/lib/utils"

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
    style: {
      display: 'block',
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
      className={cn(s.root.className, className)}
      style={s.root.style}
      {...props}
    >
      <SwitchPrimitive.Thumb
        data-slot="switch-thumb"
        className={s.thumb.className}
        style={s.thumb.style}
      />
    </SwitchPrimitive.Root>
  )
}

export { Switch }
