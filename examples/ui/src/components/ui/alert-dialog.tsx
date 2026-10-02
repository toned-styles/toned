'use client'

import type { Variants } from '@toned/core'
import { useStyles } from '@toned/react'
import { stylesheet } from '@toned/systems/base'
import { AlertDialog as AlertDialogPrimitive } from 'radix-ui'
import type * as React from 'react'

import { Button } from '@/components/ui/button.tsx'

export const alertDialogStyles = stylesheet({
  overlay: {
    bgColor: 'overlay',
    position: 'fixed',
    zIndex: 50,
    // No token for the inset shorthand.
    '@platform web': { $style: { inset: 0 } },
  },
  content: {
    bgColor: 'elevated',
    textColor: 'default',
    position: 'fixed',
    zIndex: 50,
    display: 'grid',
    gap: 4,
    width: '100%',
    maxWidth: 'calc(100% - 2rem)',
    padding: 6,
    borderRadius: 'xlarge',
    borderColor: 'default',
    borderWidth: 'thin',
    shadow: 'xlarge',
    top: '50%',
    left: '50%',
    // No token for transforms: centres the panel on its top-left anchor.
    '@platform web': { $style: { transform: 'translate(-50%, -50%)' } },
    '@media sm': { maxWidth: '28rem' },
  },
  header: {
    flexLayout: 'column',
    gap: 2,
  },
  footer: {
    flexLayout: 'column-reverse',
    gap: 2,
    '@media sm': { flexLayout: 'row', justifyContent: 'flex-end' },
  },
  title: {
    typo: 'heading_4',
    fontSize: '1.125rem',
  },
  description: {
    textColor: 'muted',
    typo: 'body_small',
  },
  media: {
    bgColor: 'action_secondary',
    textColor: 'on_action_secondary',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 'large',
    width: '2.5rem',
    height: '2.5rem',
    marginBottom: 1,
  },
}).variants(
  ($: Variants<{ size: 'default' | 'sm' }>) => ({
    [$.size('sm')]: {
      content: { '@media sm': { maxWidth: '20rem' } },
      footer: { '@media sm': { justifyContent: 'stretch' } },
    },
  }),
  { defaults: { size: 'default' } },
)

function AlertDialog({
  ...props
}: React.ComponentProps<typeof AlertDialogPrimitive.Root>) {
  return <AlertDialogPrimitive.Root data-slot="alert-dialog" {...props} />
}

function AlertDialogTrigger({
  ...props
}: React.ComponentProps<typeof AlertDialogPrimitive.Trigger>) {
  return (
    <AlertDialogPrimitive.Trigger data-slot="alert-dialog-trigger" {...props} />
  )
}

function AlertDialogPortal({
  ...props
}: React.ComponentProps<typeof AlertDialogPrimitive.Portal>) {
  return (
    <AlertDialogPrimitive.Portal data-slot="alert-dialog-portal" {...props} />
  )
}

function AlertDialogOverlay({
  className,
  ...props
}: React.ComponentProps<typeof AlertDialogPrimitive.Overlay>) {
  const s = useStyles(alertDialogStyles)

  return (
    <AlertDialogPrimitive.Overlay
      data-slot="alert-dialog-overlay"
      {...s.overlay.with({ className })}
      {...props}
    />
  )
}

function AlertDialogContent({
  className,
  size = 'default',
  ...props
}: React.ComponentProps<typeof AlertDialogPrimitive.Content> & {
  size?: 'default' | 'sm'
}) {
  const s = useStyles(alertDialogStyles, { size })

  return (
    <AlertDialogPortal>
      <AlertDialogOverlay />
      <AlertDialogPrimitive.Content
        data-slot="alert-dialog-content"
        data-size={size}
        {...s.content.with({ className })}
        {...props}
      />
    </AlertDialogPortal>
  )
}

function AlertDialogHeader({
  className,
  ...props
}: React.ComponentProps<'div'>) {
  const s = useStyles(alertDialogStyles)

  return (
    <div
      data-slot="alert-dialog-header"
      {...s.header.with({ className })}
      {...props}
    />
  )
}

function AlertDialogFooter({
  className,
  ...props
}: React.ComponentProps<'div'>) {
  const s = useStyles(alertDialogStyles)

  return (
    <div
      data-slot="alert-dialog-footer"
      {...s.footer.with({ className })}
      {...props}
    />
  )
}

function AlertDialogTitle({
  className,
  ...props
}: React.ComponentProps<typeof AlertDialogPrimitive.Title>) {
  const s = useStyles(alertDialogStyles)

  return (
    <AlertDialogPrimitive.Title
      data-slot="alert-dialog-title"
      {...s.title.with({ className })}
      {...props}
    />
  )
}

function AlertDialogDescription({
  className,
  ...props
}: React.ComponentProps<typeof AlertDialogPrimitive.Description>) {
  const s = useStyles(alertDialogStyles)

  return (
    <AlertDialogPrimitive.Description
      data-slot="alert-dialog-description"
      {...s.description.with({ className })}
      {...props}
    />
  )
}

function AlertDialogMedia({
  className,
  ...props
}: React.ComponentProps<'div'>) {
  const s = useStyles(alertDialogStyles)

  return (
    <div
      data-slot="alert-dialog-media"
      {...s.media.with({ className })}
      {...props}
    />
  )
}

function AlertDialogAction({
  className,
  variant = 'default',
  size = 'default',
  ...props
}: React.ComponentProps<typeof AlertDialogPrimitive.Action> &
  Pick<React.ComponentProps<typeof Button>, 'variant' | 'size'>) {
  return (
    <Button variant={variant} size={size} asChild>
      <AlertDialogPrimitive.Action
        data-slot="alert-dialog-action"
        className={className}
        {...props}
      />
    </Button>
  )
}

function AlertDialogCancel({
  className,
  variant = 'outline',
  size = 'default',
  ...props
}: React.ComponentProps<typeof AlertDialogPrimitive.Cancel> &
  Pick<React.ComponentProps<typeof Button>, 'variant' | 'size'>) {
  return (
    <Button variant={variant} size={size} asChild>
      <AlertDialogPrimitive.Cancel
        data-slot="alert-dialog-cancel"
        className={className}
        {...props}
      />
    </Button>
  )
}

export {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogOverlay,
  AlertDialogPortal,
  AlertDialogTitle,
  AlertDialogTrigger,
}
