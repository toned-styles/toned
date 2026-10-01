import type { Variants } from '@toned/core'
import { useStyles } from '@toned/react'
import { stylesheet } from '@toned/systems/base'
import { Slot } from 'radix-ui'
import type * as React from 'react'

const badgeStyles = stylesheet({
  root: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 1,
    flexShrink: '0',
    width: 'fit-content',
    height: '1.375rem',
    paddingX: 2,
    borderRadius: 'full',
    typo: 'caption',
    fontWeight: 500,
    overflow: 'hidden',
    // No token for text wrapping.
    style: { whiteSpace: 'nowrap' as const },
    ':focus-visible': { shadow: 'focus' },
  },
}).variants(
  (
    $: Variants<{
      variant:
        | 'default'
        | 'secondary'
        | 'destructive'
        | 'outline'
        | 'ghost'
        | 'link'
    }>,
  ) => ({
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
        bgColor: 'default',
        textColor: 'default',
        borderColor: 'default',
        borderWidth: 'thin',
      },
    },
    [$.variant('ghost')]: {
      root: { textColor: 'muted' },
    },
    [$.variant('link')]: {
      root: {
        textColor: 'action',
        textDecoration: 'underline',
        // No token for the underline offset.
        style: { textUnderlineOffset: '4px' },
      },
    },
  }),
  { defaults: { variant: 'default' } },
)

type BadgeVariant =
  | 'default'
  | 'secondary'
  | 'destructive'
  | 'outline'
  | 'ghost'
  | 'link'

function Badge({
  className,
  variant = 'default',
  asChild = false,
  ...props
}: React.ComponentProps<'span'> & {
  variant?: BadgeVariant
  asChild?: boolean
}) {
  const Comp = asChild ? Slot.Root : 'span'
  const s = useStyles(badgeStyles, { variant })

  return (
    <Comp
      data-slot="badge"
      data-variant={variant}
      {...s.root.with({ className })}
      {...props}
    />
  )
}

export { Badge, badgeStyles }
