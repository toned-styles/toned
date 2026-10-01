import { useStyles } from '@toned/react'
import { stylesheet } from '@toned/systems/base'
import { XIcon } from 'lucide-react'
import { Dialog as DialogPrimitive } from 'radix-ui'
import type * as React from 'react'

import { Button } from '@/components/ui/button.tsx'

export const dialogStyles = stylesheet({
  overlay: {
    bgColor: 'overlay',
    position: 'fixed',
    zIndex: 50,
    // No token for the inset shorthand.
    style: { inset: 0 },
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
    style: { transform: 'translate(-50%, -50%)' },
    '@sm': { maxWidth: '30rem' },
  },
  close: {
    position: 'absolute',
    top: 3,
    right: 3,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '1.75rem',
    height: '1.75rem',
    borderRadius: 'medium',
    textColor: 'muted',
    cursor: 'pointer',
    // No token: the transition list is specific to this part.
    style: {
      transition: 'color 0.15s, background-color 0.15s, box-shadow 0.15s',
    },
    ':hover': { bgColor: 'subtle', textColor: 'default' },
    ':focus-visible': { shadow: 'focus' },
  },
  header: {
    flexLayout: 'column',
    gap: 2,
    paddingRight: 8,
  },
  footer: {
    flexLayout: 'column-reverse',
    gap: 2,
    '@sm': { flexLayout: 'row', justifyContent: 'flex-end' },
  },
  title: {
    typo: 'heading_4',
    fontSize: '1.125rem',
  },
  description: {
    textColor: 'muted',
    typo: 'body_small',
  },
})

function Dialog({
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Root>) {
  return <DialogPrimitive.Root data-slot="dialog" {...props} />
}

function DialogTrigger({
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Trigger>) {
  return <DialogPrimitive.Trigger data-slot="dialog-trigger" {...props} />
}

function DialogPortal({
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Portal>) {
  return <DialogPrimitive.Portal data-slot="dialog-portal" {...props} />
}

function DialogClose({
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Close>) {
  return <DialogPrimitive.Close data-slot="dialog-close" {...props} />
}

function DialogOverlay({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Overlay>) {
  const s = useStyles(dialogStyles)

  return (
    <DialogPrimitive.Overlay
      data-slot="dialog-overlay"
      {...s.overlay.with({ className })}
      {...props}
    />
  )
}

function DialogContent({
  className,
  children,
  showCloseButton = true,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Content> & {
  showCloseButton?: boolean
}) {
  const s = useStyles(dialogStyles)

  return (
    <DialogPortal data-slot="dialog-portal">
      <DialogOverlay />
      <DialogPrimitive.Content
        data-slot="dialog-content"
        {...s.content.with({ className })}
        {...props}
      >
        {children}
        {showCloseButton && (
          <DialogPrimitive.Close
            data-slot="dialog-close"
            aria-label="Close"
            {...s.close}
          >
            <XIcon />
          </DialogPrimitive.Close>
        )}
      </DialogPrimitive.Content>
    </DialogPortal>
  )
}

function DialogHeader({ className, ...props }: React.ComponentProps<'div'>) {
  const s = useStyles(dialogStyles)

  return (
    <div
      data-slot="dialog-header"
      {...s.header.with({ className })}
      {...props}
    />
  )
}

function DialogFooter({
  className,
  showCloseButton = false,
  children,
  ...props
}: React.ComponentProps<'div'> & {
  showCloseButton?: boolean
}) {
  const s = useStyles(dialogStyles)

  return (
    <div data-slot="dialog-footer" {...s.footer.with({ className })} {...props}>
      {children}
      {showCloseButton && (
        <DialogPrimitive.Close asChild>
          <Button variant="outline">Close</Button>
        </DialogPrimitive.Close>
      )}
    </div>
  )
}

function DialogTitle({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Title>) {
  const s = useStyles(dialogStyles)

  return (
    <DialogPrimitive.Title
      data-slot="dialog-title"
      {...s.title.with({ className })}
      {...props}
    />
  )
}

function DialogDescription({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Description>) {
  const s = useStyles(dialogStyles)

  return (
    <DialogPrimitive.Description
      data-slot="dialog-description"
      {...s.description.with({ className })}
      {...props}
    />
  )
}

export {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
  DialogTrigger,
}
