"use client"

import * as React from "react"
import { AlertDialog as AlertDialogPrimitive } from "radix-ui"
import { useStyles } from "@toned/react"
import { stylesheet } from "@toned/systems/base"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

const alertDialogStyles = stylesheet({
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
  contentSm: {
    style: {
      maxWidth: '20rem',
    },
  },
  header: {
    display: 'grid',
    gap: 1.5,
    style: {
      placeItems: 'center',
      textAlign: 'center',
      gridTemplateRows: 'auto 1fr',
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
  footerSm: {
    display: 'grid',
    style: {
      gridTemplateColumns: 'repeat(2, 1fr)',
    },
  },
  title: {
    fontSize: '1.125rem',
    fontWeight: 600,
  },
  description: {
    textColor: 'muted',
    typo: 'body_small',
  },
  media: {
    bgColor: 'action_secondary',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 'medium',
    style: {
      width: '4rem',
      height: '4rem',
      marginBottom: '0.5rem',
    },
  },
})

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
      className={cn(s.overlay.className, className)}
      style={s.overlay.style}
      {...props}
    />
  )
}

function AlertDialogContent({
  className,
  size = "default",
  ...props
}: React.ComponentProps<typeof AlertDialogPrimitive.Content> & {
  size?: "default" | "sm"
}) {
  const s = useStyles(alertDialogStyles)
  const sizeStyle = size === "sm" ? s.contentSm.style : undefined

  return (
    <AlertDialogPortal>
      <AlertDialogOverlay />
      <AlertDialogPrimitive.Content
        data-slot="alert-dialog-content"
        data-size={size}
        className={cn(
          s.content.className,
          size === "sm" && s.contentSm.className,
          className
        )}
        style={{ ...s.content.style, ...sizeStyle }}
        {...props}
      />
    </AlertDialogPortal>
  )
}

function AlertDialogHeader({
  className,
  ...props
}: React.ComponentProps<"div">) {
  const s = useStyles(alertDialogStyles)

  return (
    <div
      data-slot="alert-dialog-header"
      className={cn(s.header.className, className)}
      style={s.header.style}
      {...props}
    />
  )
}

function AlertDialogFooter({
  className,
  ...props
}: React.ComponentProps<"div">) {
  const s = useStyles(alertDialogStyles)

  return (
    <div
      data-slot="alert-dialog-footer"
      className={cn(s.footer.className, className)}
      style={s.footer.style}
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
      className={cn(s.title.className, className)}
      style={s.title.style}
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
      className={cn(s.description.className, className)}
      style={s.description.style}
      {...props}
    />
  )
}

function AlertDialogMedia({
  className,
  ...props
}: React.ComponentProps<"div">) {
  const s = useStyles(alertDialogStyles)

  return (
    <div
      data-slot="alert-dialog-media"
      className={cn(s.media.className, className)}
      style={s.media.style}
      {...props}
    />
  )
}

function AlertDialogAction({
  className,
  variant = "default",
  size = "default",
  ...props
}: React.ComponentProps<typeof AlertDialogPrimitive.Action> &
  Pick<React.ComponentProps<typeof Button>, "variant" | "size">) {
  return (
    <Button variant={variant} size={size} asChild>
      <AlertDialogPrimitive.Action
        data-slot="alert-dialog-action"
        className={cn(className)}
        {...props}
      />
    </Button>
  )
}

function AlertDialogCancel({
  className,
  variant = "outline",
  size = "default",
  ...props
}: React.ComponentProps<typeof AlertDialogPrimitive.Cancel> &
  Pick<React.ComponentProps<typeof Button>, "variant" | "size">) {
  return (
    <Button variant={variant} size={size} asChild>
      <AlertDialogPrimitive.Cancel
        data-slot="alert-dialog-cancel"
        className={cn(className)}
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
