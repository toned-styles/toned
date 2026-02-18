"use client"

import * as React from "react"
import { CheckIcon, ChevronRightIcon, CircleIcon } from "lucide-react"
import { Menubar as MenubarPrimitive } from "radix-ui"
import { useStyles } from "@toned/react"
import { stylesheet } from "@toned/systems/base"


const menubarStyles = stylesheet({
  root: {
    bgColor: 'default',
    display: 'flex',
    alignItems: 'center',
    gap: 1,
    borderRadius: 'medium',
    borderColor: 'default',
    borderWidth: 'thin',
    padding: 1,
    shadow: 'small',
    height: '2.25rem',
  },
  trigger: {
    display: 'flex',
    alignItems: 'center',
    borderRadius: 'small',
    paddingX: 2,
    paddingY: 1,
    typo: 'body_small',
    fontWeight: 500,
    cursor: 'default',
    style: {
      outline: 'none',
      userSelect: 'none',
      border: 'none',
      background: 'none',
    },
  },
  content: {
    bgColor: 'elevated',
    textColor: 'default',
    zIndex: 50,
    borderRadius: 'medium',
    borderColor: 'default',
    borderWidth: 'thin',
    padding: 1,
    shadow: 'medium',
    minWidth: '12rem',
    overflow: 'hidden',
    style: {
      transformOrigin: 'var(--radix-menubar-content-transform-origin)',
      animation: 'fade-in 0.15s ease, zoom-in 0.15s ease',
    },
  },
  item: {
    display: 'flex',
    alignItems: 'center',
    gap: 2,
    borderRadius: 'small',
    paddingX: 2,
    paddingY: 1.5,
    typo: 'body_small',
    position: 'relative',
    cursor: 'default',
    style: {
      outline: 'none',
      userSelect: 'none',
    },
  },
  checkboxItem: {
    display: 'flex',
    alignItems: 'center',
    gap: 2,
    borderRadius: 'small',
    paddingY: 1.5,
    typo: 'body_small',
    position: 'relative',
    cursor: 'default',
    style: {
      outline: 'none',
      userSelect: 'none',
      paddingRight: '0.5rem',
      paddingLeft: '2rem',
    },
  },
  indicator: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'absolute',
    pointerEvents: 'none',
    style: {
      left: '0.5rem',
      width: '0.875rem',
      height: '0.875rem',
    },
  },
  label: {
    paddingX: 2,
    paddingY: 1.5,
    typo: 'body_small',
    fontWeight: 500,
  },
  separator: {
    bgColor: 'subtle',
    height: '1px',
    style: {
      margin: '0.25rem -0.25rem',
    },
  },
  shortcut: {
    textColor: 'muted',
    typo: 'caption',
    letterSpacing: '0.1em',
    style: {
      marginLeft: 'auto',
    },
  },
  subContent: {
    bgColor: 'elevated',
    textColor: 'default',
    zIndex: 50,
    borderRadius: 'medium',
    borderColor: 'default',
    borderWidth: 'thin',
    padding: 1,
    shadow: 'large',
    minWidth: '8rem',
    overflow: 'hidden',
    style: {
      transformOrigin: 'var(--radix-menubar-content-transform-origin)',
      animation: 'fade-in 0.15s ease, zoom-in 0.15s ease',
    },
  },
})

function Menubar({
  className,
  ...props
}: React.ComponentProps<typeof MenubarPrimitive.Root>) {
  const s = useStyles(menubarStyles)

  return (
    <MenubarPrimitive.Root
      data-slot="menubar"
      {...s.root.with({ className })}
      {...props}
    />
  )
}

function MenubarMenu({
  ...props
}: React.ComponentProps<typeof MenubarPrimitive.Menu>) {
  return <MenubarPrimitive.Menu data-slot="menubar-menu" {...props} />
}

function MenubarGroup({
  ...props
}: React.ComponentProps<typeof MenubarPrimitive.Group>) {
  return <MenubarPrimitive.Group data-slot="menubar-group" {...props} />
}

function MenubarPortal({
  ...props
}: React.ComponentProps<typeof MenubarPrimitive.Portal>) {
  return <MenubarPrimitive.Portal data-slot="menubar-portal" {...props} />
}

function MenubarRadioGroup({
  ...props
}: React.ComponentProps<typeof MenubarPrimitive.RadioGroup>) {
  return (
    <MenubarPrimitive.RadioGroup data-slot="menubar-radio-group" {...props} />
  )
}

function MenubarTrigger({
  className,
  ...props
}: React.ComponentProps<typeof MenubarPrimitive.Trigger>) {
  const s = useStyles(menubarStyles)

  return (
    <MenubarPrimitive.Trigger
      data-slot="menubar-trigger"
      {...s.trigger.with({ className })}
      {...props}
    />
  )
}

function MenubarContent({
  className,
  align = "start",
  alignOffset = -4,
  sideOffset = 8,
  ...props
}: React.ComponentProps<typeof MenubarPrimitive.Content>) {
  const s = useStyles(menubarStyles)

  return (
    <MenubarPortal>
      <MenubarPrimitive.Content
        data-slot="menubar-content"
        align={align}
        alignOffset={alignOffset}
        sideOffset={sideOffset}
        {...s.content.with({ className })}
        {...props}
      />
    </MenubarPortal>
  )
}

function MenubarItem({
  className,
  inset,
  variant = "default",
  ...props
}: React.ComponentProps<typeof MenubarPrimitive.Item> & {
  inset?: boolean
  variant?: "default" | "destructive"
}) {
  const s = useStyles(menubarStyles)

  return (
    <MenubarPrimitive.Item
      data-slot="menubar-item"
      data-inset={inset}
      data-variant={variant}
      {...s.item.with({ className })}
      {...props}
    />
  )
}

function MenubarCheckboxItem({
  className,
  children,
  checked,
  ...props
}: React.ComponentProps<typeof MenubarPrimitive.CheckboxItem>) {
  const s = useStyles(menubarStyles)

  return (
    <MenubarPrimitive.CheckboxItem
      data-slot="menubar-checkbox-item"
      {...s.checkboxItem.with({ className })}
      checked={checked}
      {...props}
    >
      <span {...s.indicator}>
        <MenubarPrimitive.ItemIndicator>
          <CheckIcon className="size-4" />
        </MenubarPrimitive.ItemIndicator>
      </span>
      {children}
    </MenubarPrimitive.CheckboxItem>
  )
}

function MenubarRadioItem({
  className,
  children,
  ...props
}: React.ComponentProps<typeof MenubarPrimitive.RadioItem>) {
  const s = useStyles(menubarStyles)

  return (
    <MenubarPrimitive.RadioItem
      data-slot="menubar-radio-item"
      {...s.checkboxItem.with({ className })}
      {...props}
    >
      <span {...s.indicator}>
        <MenubarPrimitive.ItemIndicator>
          <CircleIcon className="size-2 fill-current" />
        </MenubarPrimitive.ItemIndicator>
      </span>
      {children}
    </MenubarPrimitive.RadioItem>
  )
}

function MenubarLabel({
  className,
  inset,
  ...props
}: React.ComponentProps<typeof MenubarPrimitive.Label> & {
  inset?: boolean
}) {
  const s = useStyles(menubarStyles)

  return (
    <MenubarPrimitive.Label
      data-slot="menubar-label"
      data-inset={inset}
      {...s.label.with({ className })}
      {...props}
    />
  )
}

function MenubarSeparator({
  className,
  ...props
}: React.ComponentProps<typeof MenubarPrimitive.Separator>) {
  const s = useStyles(menubarStyles)

  return (
    <MenubarPrimitive.Separator
      data-slot="menubar-separator"
      {...s.separator.with({ className })}
      {...props}
    />
  )
}

function MenubarShortcut({
  className,
  ...props
}: React.ComponentProps<"span">) {
  const s = useStyles(menubarStyles)

  return (
    <span
      data-slot="menubar-shortcut"
      {...s.shortcut.with({ className })}
      {...props}
    />
  )
}

function MenubarSub({
  ...props
}: React.ComponentProps<typeof MenubarPrimitive.Sub>) {
  return <MenubarPrimitive.Sub data-slot="menubar-sub" {...props} />
}

function MenubarSubTrigger({
  className,
  inset,
  children,
  ...props
}: React.ComponentProps<typeof MenubarPrimitive.SubTrigger> & {
  inset?: boolean
}) {
  const s = useStyles(menubarStyles)

  return (
    <MenubarPrimitive.SubTrigger
      data-slot="menubar-sub-trigger"
      data-inset={inset}
      {...s.item.with({ className })}
      {...props}
    >
      {children}
      <ChevronRightIcon className="ml-auto h-4 w-4" />
    </MenubarPrimitive.SubTrigger>
  )
}

function MenubarSubContent({
  className,
  ...props
}: React.ComponentProps<typeof MenubarPrimitive.SubContent>) {
  const s = useStyles(menubarStyles)

  return (
    <MenubarPrimitive.SubContent
      data-slot="menubar-sub-content"
      {...s.subContent.with({ className })}
      {...props}
    />
  )
}

export {
  Menubar,
  MenubarPortal,
  MenubarMenu,
  MenubarTrigger,
  MenubarContent,
  MenubarGroup,
  MenubarSeparator,
  MenubarLabel,
  MenubarItem,
  MenubarShortcut,
  MenubarCheckboxItem,
  MenubarRadioGroup,
  MenubarRadioItem,
  MenubarSub,
  MenubarSubTrigger,
  MenubarSubContent,
}
