"use client"

import * as React from "react"
import { XIcon } from "lucide-react"
import { Dialog as SheetPrimitive } from "radix-ui"
import { useStyles } from "@toned/react"
import { stylesheet } from "@toned/systems/base"

const sheetStyles = stylesheet({
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
    flexLayout: 'column',
    gap: 4,
    shadow: 'large',
    style: {
      transition: 'transform 0.3s ease-in-out',
    },
  },
  close: {
    position: 'absolute',
    borderRadius: 'small',
    opacity: 0.7,
    top: '1rem',
    right: '1rem',
    cursor: 'pointer',
    padding: 0,
    style: {
      transition: 'opacity 0.15s',
      background: 'none',
      border: 'none',
    },
    ':hover': {
      opacity: 1,
    },
  },
  header: {
    flexLayout: 'column',
    gap: 1.5,
    padding: 4,
  },
  footer: {
    flexLayout: 'column',
    gap: 2,
    padding: 4,
    style: { marginTop: 'auto' },
  },
  title: {
    textColor: 'default',
    fontWeight: 600,
  },
  description: {
    textColor: 'muted',
    typo: 'body_small',
  },
})

function Sheet({ ...props }: React.ComponentProps<typeof SheetPrimitive.Root>) {
  return <SheetPrimitive.Root data-slot="sheet" {...props} />
}

function SheetTrigger({
  ...props
}: React.ComponentProps<typeof SheetPrimitive.Trigger>) {
  return <SheetPrimitive.Trigger data-slot="sheet-trigger" {...props} />
}

function SheetClose({
  ...props
}: React.ComponentProps<typeof SheetPrimitive.Close>) {
  return <SheetPrimitive.Close data-slot="sheet-close" {...props} />
}

function SheetPortal({
  ...props
}: React.ComponentProps<typeof SheetPrimitive.Portal>) {
  return <SheetPrimitive.Portal data-slot="sheet-portal" {...props} />
}

function SheetOverlay({
  className,
  ...props
}: React.ComponentProps<typeof SheetPrimitive.Overlay>) {
  const s = useStyles(sheetStyles)

  return (
    <SheetPrimitive.Overlay
      data-slot="sheet-overlay"
      {...s.overlay.with({ className })}
      {...props}
    />
  )
}

function SheetContent({
  className,
  children,
  side = "right",
  showCloseButton = true,
  ...props
}: React.ComponentProps<typeof SheetPrimitive.Content> & {
  side?: "top" | "right" | "bottom" | "left"
  showCloseButton?: boolean
}) {
  const s = useStyles(sheetStyles)
  const sideStyles: React.CSSProperties = {
    right: { inset: '0 0 0 auto', height: '100%', width: '75%', maxWidth: '24rem', borderLeft: '1px solid var(--border)' },
    left: { inset: '0 auto 0 0', height: '100%', width: '75%', maxWidth: '24rem', borderRight: '1px solid var(--border)' },
    top: { inset: '0 0 auto 0', height: 'auto', borderBottom: '1px solid var(--border)' },
    bottom: { inset: 'auto 0 0 0', height: 'auto', borderTop: '1px solid var(--border)' },
  }[side]

  return (
    <SheetPortal>
      <SheetOverlay />
      <SheetPrimitive.Content
        data-slot="sheet-content"
        data-side={side}
        {...s.content.with({ className, style: sideStyles })}
        {...props}
      >
        {children}
        {showCloseButton && (
          <SheetPrimitive.Close
            {...s.close}
          >
            <XIcon className="size-4" />
            <span className="sr-only">Close</span>
          </SheetPrimitive.Close>
        )}
      </SheetPrimitive.Content>
    </SheetPortal>
  )
}

function SheetHeader({ className, ...props }: React.ComponentProps<"div">) {
  const s = useStyles(sheetStyles)

  return (
    <div
      data-slot="sheet-header"
      {...s.header.with({ className })}
      {...props}
    />
  )
}

function SheetFooter({ className, ...props }: React.ComponentProps<"div">) {
  const s = useStyles(sheetStyles)

  return (
    <div
      data-slot="sheet-footer"
      {...s.footer.with({ className })}
      {...props}
    />
  )
}

function SheetTitle({
  className,
  ...props
}: React.ComponentProps<typeof SheetPrimitive.Title>) {
  const s = useStyles(sheetStyles)

  return (
    <SheetPrimitive.Title
      data-slot="sheet-title"
      {...s.title.with({ className })}
      {...props}
    />
  )
}

function SheetDescription({
  className,
  ...props
}: React.ComponentProps<typeof SheetPrimitive.Description>) {
  const s = useStyles(sheetStyles)

  return (
    <SheetPrimitive.Description
      data-slot="sheet-description"
      {...s.description.with({ className })}
      {...props}
    />
  )
}

export {
  Sheet,
  SheetTrigger,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetFooter,
  SheetTitle,
  SheetDescription,
}
