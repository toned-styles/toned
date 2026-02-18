import * as React from "react"
import { useStyles } from "@toned/react"
import { stylesheet } from "@toned/systems/base"

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
    alignItems: 'flex-start',
    style: {
      display: 'grid',
      gridTemplateColumns: '0 1fr',
      gap: '2px 0',
    },
  },
  title: {
    fontWeight: 500,
    overflow: 'hidden',
    minHeight: '1rem',
    style: {
      gridColumnStart: 2,
      letterSpacing: '-0.01em',
      display: '-webkit-box',
      WebkitLineClamp: 1,
      WebkitBoxOrient: 'vertical' as const,
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
      {...s.root.with({ className })}
      {...props}
    />
  )
}

function AlertTitle({ className, ...props }: React.ComponentProps<"div">) {
  const s = useStyles(alertStyles, { variant: 'default' })

  return (
    <div
      data-slot="alert-title"
      {...s.title.with({ className })}
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
      {...s.description.with({ className })}
      {...props}
    />
  )
}

export { Alert, AlertTitle, AlertDescription }
