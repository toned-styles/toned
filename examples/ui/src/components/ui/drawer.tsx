import { useStyles } from '@toned/react'
import { stylesheet } from '@toned/systems/base'
import type * as React from 'react'
import { Drawer as DrawerPrimitive } from 'vaul'

/*
 * Where the panel sits, its rounded corners and the handle depend on vaul's
 * `data-vaul-drawer-direction`, so those rules are structural CSS in styles.css.
 */
export const drawerStyles = stylesheet({
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
    borderColor: 'default',
    position: 'fixed',
    zIndex: 50,
    flexLayout: 'column',
    shadow: 'xlarge',
  },
  handle: {
    bgColor: 'interactive_muted',
    borderRadius: 'full',
    width: '3rem',
    height: '0.25rem',
    flexShrink: '0',
    marginX: 'auto',
    marginTop: 3,
  },
  header: {
    flexLayout: 'column',
    gap: 1.5,
    padding: 5,
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
})

function Drawer({
  ...props
}: React.ComponentProps<typeof DrawerPrimitive.Root>) {
  return <DrawerPrimitive.Root data-slot="drawer" {...props} />
}

function DrawerTrigger({
  ...props
}: React.ComponentProps<typeof DrawerPrimitive.Trigger>) {
  return <DrawerPrimitive.Trigger data-slot="drawer-trigger" {...props} />
}

function DrawerPortal({
  ...props
}: React.ComponentProps<typeof DrawerPrimitive.Portal>) {
  return <DrawerPrimitive.Portal data-slot="drawer-portal" {...props} />
}

function DrawerClose({
  ...props
}: React.ComponentProps<typeof DrawerPrimitive.Close>) {
  return <DrawerPrimitive.Close data-slot="drawer-close" {...props} />
}

function DrawerOverlay({
  className,
  ...props
}: React.ComponentProps<typeof DrawerPrimitive.Overlay>) {
  const s = useStyles(drawerStyles)

  return (
    <DrawerPrimitive.Overlay
      data-slot="drawer-overlay"
      {...s.overlay.with({ className })}
      {...props}
    />
  )
}

function DrawerContent({
  className,
  children,
  ...props
}: React.ComponentProps<typeof DrawerPrimitive.Content>) {
  const s = useStyles(drawerStyles)

  return (
    <DrawerPortal data-slot="drawer-portal">
      <DrawerOverlay />
      <DrawerPrimitive.Content
        data-slot="drawer-content"
        {...s.content.with({ className })}
        {...props}
      >
        <div {...s.handle} data-slot="drawer-handle" />
        {children}
      </DrawerPrimitive.Content>
    </DrawerPortal>
  )
}

function DrawerHeader({ className, ...props }: React.ComponentProps<'div'>) {
  const s = useStyles(drawerStyles)

  return (
    <div
      data-slot="drawer-header"
      {...s.header.with({ className })}
      {...props}
    />
  )
}

function DrawerFooter({ className, ...props }: React.ComponentProps<'div'>) {
  const s = useStyles(drawerStyles)

  return (
    <div
      data-slot="drawer-footer"
      {...s.footer.with({ className })}
      {...props}
    />
  )
}

function DrawerTitle({
  className,
  ...props
}: React.ComponentProps<typeof DrawerPrimitive.Title>) {
  const s = useStyles(drawerStyles)

  return (
    <DrawerPrimitive.Title
      data-slot="drawer-title"
      {...s.title.with({ className })}
      {...props}
    />
  )
}

function DrawerDescription({
  className,
  ...props
}: React.ComponentProps<typeof DrawerPrimitive.Description>) {
  const s = useStyles(drawerStyles)

  return (
    <DrawerPrimitive.Description
      data-slot="drawer-description"
      {...s.description.with({ className })}
      {...props}
    />
  )
}

export {
  Drawer,
  DrawerPortal,
  DrawerOverlay,
  DrawerTrigger,
  DrawerClose,
  DrawerContent,
  DrawerHeader,
  DrawerFooter,
  DrawerTitle,
  DrawerDescription,
}
