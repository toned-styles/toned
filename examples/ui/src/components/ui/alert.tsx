import type { Variants } from '@toned/core'
import { useStyles } from '@toned/react'
import { stylesheet } from '@toned/systems/base'
import type * as React from 'react'

/*
 * The grid template lives in styles.css: an alert with a leading icon gets a
 * second column, which depends on its children (`:has(> svg)`).
 */
export const alertStyles = stylesheet({
  root: {
    display: 'grid',
    rowGap: 1,
    position: 'relative',
    width: '100%',
    paddingX: 4,
    paddingY: 3,
    borderRadius: 'large',
    borderWidth: 'thin',
    typo: 'body_small',
  },
  title: {
    typo: 'label_small',
  },
  description: {
    textColor: 'muted',
    typo: 'body_small',
  },
}).variants(
  (
    $: Variants<{
      variant: 'default' | 'destructive'
    }>,
  ) => ({
    [$.variant('default')]: {
      root: {
        bgColor: 'elevated',
        textColor: 'default',
        borderColor: 'default',
      },
    },
    [$.variant('destructive')]: {
      root: {
        bgColor: 'elevated',
        textColor: 'destructive',
        borderColor: 'destructive',
      },
    },
  }),
  { defaults: { variant: 'default' } },
)

type AlertVariant = 'default' | 'destructive'

function Alert({
  className,
  variant = 'default',
  ...props
}: React.ComponentProps<'div'> & {
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

function AlertTitle({ className, ...props }: React.ComponentProps<'div'>) {
  const s = useStyles(alertStyles, { variant: 'default' })

  return (
    <div data-slot="alert-title" {...s.title.with({ className })} {...props} />
  )
}

function AlertDescription({
  className,
  ...props
}: React.ComponentProps<'div'>) {
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
