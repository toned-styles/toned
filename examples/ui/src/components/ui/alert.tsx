import * as React from "react"
import { useStyles } from "@toned/react"
import { stylesheet } from "@toned/systems/base"

import { cn } from "@/lib/utils"

const alertStyles = stylesheet({
  root: {
    borderRadius: 'large',
    borderColor: 'default',
    borderWidth: 'thin',
    paddingX: 4,
    paddingY: 3,
    typo: 'body_small',
    position: 'relative',
    width: '100%',
    style: {
      display: 'grid',
      gridTemplateColumns: '0 1fr',
      gap: '2px 0',
      alignItems: 'start',
    },
  },
  title: {
    fontWeight: 500,
    style: {
      gridColumnStart: 2,
      minHeight: '1rem',
      letterSpacing: '-0.01em',
      display: '-webkit-box',
      WebkitLineClamp: 1,
      WebkitBoxOrient: 'vertical' as const,
      overflow: 'hidden',
    },
  },
  description: {
    textColor: 'muted',
    typo: 'body_small',
    style: {
      gridColumnStart: 2,
      display: 'grid',
      justifyItems: 'start',
      gap: '4px',
    },
  },
}).variants<{
  variant: 'default' | 'destructive'
}>(($) => ({
  [$.variant('default')]: {
    root: { bgColor: 'elevated', textColor: 'default' },
  },
  [$.variant('destructive')]: {
    root: { bgColor: 'elevated', textColor: 'destructive' },
  },
}))

type AlertVariant = 'default' | 'destructive'

function Alert({
  className,
  variant = "default",
  ...props
}: React.ComponentProps<"div"> & {
  variant?: AlertVariant
}) {
  const s = useStyles(alertStyles, { variant })

  return (
    <div
      data-slot="alert"
      data-variant={variant}
      role="alert"
      className={cn(s.root.className, className)}
      style={s.root.style}
      {...props}
    />
  )
}

function AlertTitle({ className, ...props }: React.ComponentProps<"div">) {
  const s = useStyles(alertStyles, { variant: 'default' })

  return (
    <div
      data-slot="alert-title"
      className={cn(s.title.className, className)}
      style={s.title.style}
      {...props}
    />
  )
}

function AlertDescription({
  className,
  ...props
}: React.ComponentProps<"div">) {
  const s = useStyles(alertStyles, { variant: 'default' })

  return (
    <div
      data-slot="alert-description"
      className={cn(s.description.className, className)}
      style={s.description.style}
      {...props}
    />
  )
}

export { Alert, AlertTitle, AlertDescription }
