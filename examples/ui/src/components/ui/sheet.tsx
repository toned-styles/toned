'use client'

import type { Variants } from '@toned/core'
import { useStyles } from '@toned/react'
import { stylesheet } from '@toned/systems/base'
import { XIcon } from 'lucide-react'
import { Dialog as SheetPrimitive } from 'radix-ui'
import type * as React from 'react'

export const sheetStyles = stylesheet({
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
    borderColor: 'default',
    position: 'fixed',
    zIndex: 50,
    flexLayout: 'column',
    gap: 4,
    shadow: 'xlarge',
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
    gap: 1.5,
    padding: 5,
    paddingRight: 12,
  },
  footer: {
    flexLayout: 'column',
    gap: 2,
    padding: 5,
    marginTop: 'auto',
  },
  title: {
    typo: 'heading_4',
  },
  description: {
    textColor: 'muted',
    typo: 'body_small',
  },
}).variants(
  ($: Variants<{ side: 'top' | 'right' | 'bottom' | 'left' }>) => ({
    // No token sets a single edge, so each side writes its one-pixel line.
    [$.side('right')]: {
      content: {
        top: 0,
        right: 0,
        bottom: 0,
        width: '85%',
        maxWidth: '24rem',
        style: { borderLeftWidth: 1 },
      },
    },
    [$.side('left')]: {
      content: {
        top: 0,
        left: 0,
        bottom: 0,
        width: '85%',
        maxWidth: '24rem',
        style: { borderRightWidth: 1 },
      },
    },
    [$.side('top')]: {
      content: { top: 0, left: 0, right: 0, style: { borderBottomWidth: 1 } },
    },
    [$.side('bottom')]: {
      content: { bottom: 0, left: 0, right: 0, style: { borderTopWidth: 1 } },
    },
  }),
  { defaults: { side: 'right' } },
)

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
  side = 'right',
  showCloseButton = true,
  ...props
}: React.ComponentProps<typeof SheetPrimitive.Content> & {
  side?: 'top' | 'right' | 'bottom' | 'left'
  showCloseButton?: boolean
}) {
  const s = useStyles(sheetStyles, { side })

  return (
    <SheetPortal>
      <SheetOverlay />
      <SheetPrimitive.Content
        data-slot="sheet-content"
        data-side={side}
        {...s.content.with({ className })}
        {...props}
      >
        {children}
        {showCloseButton && (
          <SheetPrimitive.Close
            data-slot="sheet-close"
            aria-label="Close"
            {...s.close}
          >
            <XIcon />
          </SheetPrimitive.Close>
        )}
      </SheetPrimitive.Content>
    </SheetPortal>
  )
}

function SheetHeader({ className, ...props }: React.ComponentProps<'div'>) {
  const s = useStyles(sheetStyles)

  return (
    <div
      data-slot="sheet-header"
      {...s.header.with({ className })}
      {...props}
    />
  )
}

function SheetFooter({ className, ...props }: React.ComponentProps<'div'>) {
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
