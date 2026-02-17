import * as React from "react"
import { XIcon } from "lucide-react"
import { Dialog as DialogPrimitive } from "radix-ui"
import { useStyles } from "@toned/react"
import { stylesheet } from "@toned/systems/base"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

const dialogStyles = stylesheet({
  overlay: {
    bgColor: 'overlay',
    position: 'fixed',
    zIndex: 50,
    style: { inset: 0 },
  },
  content: {
    bgColor: 'default',
    position: 'fixed',
    zIndex: 50,
    display: 'grid',
    width: '100%',
    gap: 4,
    borderRadius: 'large',
    borderColor: 'default',
    borderWidth: 'thin',
    padding: 6,
    shadow: 'large',
    style: {
      top: '50%',
      left: '50%',
      transform: 'translate(-50%, -50%)',
      maxWidth: 'calc(100% - 2rem)',
      outline: 'none',
      animation: 'zoom-in 0.2s ease',
    },
    '@sm': {
      maxWidth: '32rem',
    },
  },
  close: {
    position: 'absolute',
    borderRadius: 'small',
    opacity: 0.7,
    style: {
      top: '1rem',
      right: '1rem',
      transition: 'opacity 0.15s',
      background: 'none',
      border: 'none',
      cursor: 'pointer',
      padding: 0,
    },
  },
  header: {
    flexLayout: 'column',
    gap: 2,
    style: { textAlign: 'center' },
    '@sm': {
      style: { textAlign: 'left' },
    },
  },
  footer: {
    display: 'flex',
    gap: 2,
    style: {
      flexDirection: 'column-reverse',
    },
    '@sm': {
      style: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
      },
    },
  },
  title: {
    fontSize: '1.125rem',
    fontWeight: 600,
    lineHeight: '1',
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
      className={cn(s.overlay.className, className)}
      style={s.overlay.style}
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
        className={cn(s.content.className, className)}
        style={s.content.style}
        {...props}
      >
        {children}
        {showCloseButton && (
          <DialogPrimitive.Close
            data-slot="dialog-close"
            className={s.close.className}
            style={s.close.style}
          >
            <XIcon className="size-4" />
            <span className="sr-only">Close</span>
          </DialogPrimitive.Close>
        )}
      </DialogPrimitive.Content>
    </DialogPortal>
  )
}

function DialogHeader({ className, ...props }: React.ComponentProps<"div">) {
  const s = useStyles(dialogStyles)

  return (
    <div
      data-slot="dialog-header"
      className={cn(s.header.className, className)}
      style={s.header.style}
      {...props}
    />
  )
}

function DialogFooter({
  className,
  showCloseButton = false,
  children,
  ...props
}: React.ComponentProps<"div"> & {
  showCloseButton?: boolean
}) {
  const s = useStyles(dialogStyles)

  return (
    <div
      data-slot="dialog-footer"
      className={cn(s.footer.className, className)}
      style={s.footer.style}
      {...props}
    >
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
      className={cn(s.title.className, className)}
      style={s.title.style}
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
      className={cn(s.description.className, className)}
      style={s.description.style}
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
