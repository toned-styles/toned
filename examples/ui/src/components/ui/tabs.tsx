import * as React from "react"
import { Tabs as TabsPrimitive } from "radix-ui"
import { useStyles } from "@toned/react"
import { stylesheet } from "@toned/systems/base"

import { cn } from "@/lib/utils"

const tabsStyles = stylesheet({
  root: {
    display: 'flex',
    gap: 2,
  },
  list: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    textColor: 'muted',
    borderRadius: 'large',
    style: {
      padding: '3px',
      width: 'fit-content',
    },
  },
  listDefault: {
    bgColor: 'action_secondary',
  },
  listLine: {
    gap: 1,
    borderRadius: 'none',
    style: {
      background: 'transparent',
    },
  },
  trigger: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 1.5,
    borderRadius: 'medium',
    paddingX: 2,
    paddingY: 1,
    typo: 'body_small',
    fontWeight: 500,
    cursor: 'pointer',
    style: {
      flex: 1,
      position: 'relative',
      whiteSpace: 'nowrap',
      transition: 'all 0.15s',
      outline: 'none',
      border: '1px solid transparent',
      background: 'none',
    },
  },
  content: {
    style: {
      flex: 1,
      outline: 'none',
    },
  },
})

function Tabs({
  className,
  orientation = "horizontal",
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Root>) {
  const s = useStyles(tabsStyles)

  return (
    <TabsPrimitive.Root
      data-slot="tabs"
      data-orientation={orientation}
      orientation={orientation}
      {...s.root.with({
        className,
        style: {
          flexDirection: orientation === "horizontal" ? "column" : undefined,
        },
      })}
      {...props}
    />
  )
}

function TabsList({
  className,
  variant = "default",
  ...props
}: React.ComponentProps<typeof TabsPrimitive.List> & {
  variant?: "default" | "line"
}) {
  const s = useStyles(tabsStyles)

  return (
    <TabsPrimitive.List
      data-slot="tabs-list"
      data-variant={variant}
      className={cn(
        s.list.className,
        variant === "default" && s.listDefault.className,
        variant === "line" && s.listLine.className,
        className
      )}
      style={{
        ...s.list.style,
        ...(variant === "default" ? s.listDefault.style : undefined),
        ...(variant === "line" ? s.listLine.style : undefined),
      }}
      {...props}
    />
  )
}

function TabsTrigger({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Trigger>) {
  const s = useStyles(tabsStyles)

  return (
    <TabsPrimitive.Trigger
      data-slot="tabs-trigger"
      {...s.trigger.with({ className })}
      {...props}
    />
  )
}

function TabsContent({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Content>) {
  const s = useStyles(tabsStyles)

  return (
    <TabsPrimitive.Content
      data-slot="tabs-content"
      {...s.content.with({ className })}
      {...props}
    />
  )
}

export { Tabs, TabsList, TabsTrigger, TabsContent }
