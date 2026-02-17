"use client"

import * as React from "react"
import { ToggleGroup as ToggleGroupPrimitive } from "radix-ui"
import { useStyles } from "@toned/react"
import { stylesheet } from "@toned/systems/base"

import { cn } from "@/lib/utils"
import { toggleStyles } from "@/components/ui/toggle"

const toggleGroupStyles = stylesheet({
  root: {
    display: 'flex',
    alignItems: 'center',
    borderRadius: 'medium',
    style: {
      width: 'fit-content',
    },
  },
})

const ToggleGroupContext = React.createContext<{
  size?: "default" | "sm" | "lg"
  variant?: "default" | "outline"
  spacing?: number
}>({
  size: "default",
  variant: "default",
  spacing: 0,
})

function ToggleGroup({
  className,
  variant = "default",
  size = "default",
  spacing = 0,
  children,
  ...props
}: React.ComponentProps<typeof ToggleGroupPrimitive.Root> & {
  variant?: "default" | "outline"
  size?: "default" | "sm" | "lg"
  spacing?: number
}) {
  const s = useStyles(toggleGroupStyles)

  return (
    <ToggleGroupPrimitive.Root
      data-slot="toggle-group"
      data-variant={variant}
      data-size={size}
      data-spacing={spacing}
      className={cn("group/toggle-group", s.root.className, className)}
      style={{
        ...s.root.style,
        gap: spacing ? `calc(${spacing} * 0.25rem)` : undefined,
      }}
      {...props}
    >
      <ToggleGroupContext.Provider value={{ variant, size, spacing }}>
        {children}
      </ToggleGroupContext.Provider>
    </ToggleGroupPrimitive.Root>
  )
}

function ToggleGroupItem({
  className,
  children,
  variant,
  size,
  ...props
}: React.ComponentProps<typeof ToggleGroupPrimitive.Item> & {
  variant?: "default" | "outline"
  size?: "default" | "sm" | "lg"
}) {
  const context = React.useContext(ToggleGroupContext)
  const resolvedVariant = context.variant || variant || "default"
  const resolvedSize = context.size || size || "default"
  const s = useStyles(toggleStyles, { variant: resolvedVariant, size: resolvedSize })

  return (
    <ToggleGroupPrimitive.Item
      data-slot="toggle-group-item"
      data-variant={resolvedVariant}
      data-size={resolvedSize}
      data-spacing={context.spacing}
      className={cn(s.root.className, className)}
      style={{
        ...s.root.style,
        width: 'auto',
        minWidth: 0,
        flexShrink: 0,
        padding: '0 0.75rem',
      }}
      {...props}
    >
      {children}
    </ToggleGroupPrimitive.Item>
  )
}

export { ToggleGroup, ToggleGroupItem }
