import * as React from "react"
import { Slot } from "radix-ui"
import { useStyles } from "@toned/react"
import { stylesheet } from "@toned/systems/base"

import { cn } from "@/lib/utils"

const badgeStyles = stylesheet({
  root: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 'full',
    paddingX: 2,
    paddingY: 0.5,
    typo: 'caption',
    fontWeight: 500,
    flexShrink: '0',
    gap: 1,
    style: {
      width: 'fit-content',
      whiteSpace: 'nowrap' as const,
      overflow: 'hidden',
      borderWidth: '1px',
      borderStyle: 'solid',
      borderColor: 'transparent',
      transition: 'color 0.15s, box-shadow 0.15s',
    },
  },
}).variants<{
  variant: 'default' | 'secondary' | 'destructive' | 'outline' | 'ghost' | 'link'
}>(($) => ({
  [$.variant('default')]: {
    root: { bgColor: 'action', textColor: 'on_action' },
  },
  [$.variant('secondary')]: {
    root: { bgColor: 'action_secondary', textColor: 'on_action_secondary' },
  },
  [$.variant('destructive')]: {
    root: { bgColor: 'destructive', textColor: 'on_destructive' },
  },
  [$.variant('outline')]: {
    root: {
      textColor: 'default',
      borderColor: 'default',
    },
  },
  [$.variant('ghost')]: {
    root: {},
  },
  [$.variant('link')]: {
    root: {
      textColor: 'action',
      style: { textUnderlineOffset: '4px' },
    },
  },
}))

type BadgeVariant = 'default' | 'secondary' | 'destructive' | 'outline' | 'ghost' | 'link'

function Badge({
  className,
  variant = "default",
  asChild = false,
  ...props
}: React.ComponentProps<"span"> & {
  variant?: BadgeVariant
  asChild?: boolean
}) {
  const Comp = asChild ? Slot.Root : "span"
  const s = useStyles(badgeStyles, { variant })

  return (
    <Comp
      data-slot="badge"
      data-variant={variant}
      className={cn(s.root.className, className)}
      style={s.root.style}
      {...props}
    />
  )
}

export { Badge, badgeStyles }
