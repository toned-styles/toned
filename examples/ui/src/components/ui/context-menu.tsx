"use client"

import * as React from "react"
import { CheckIcon, ChevronRightIcon, CircleIcon } from "lucide-react"
import { ContextMenu as ContextMenuPrimitive } from "radix-ui"
import { useStyles } from "@toned/react"
import { stylesheet } from "@toned/systems/base"


const contextMenuStyles = stylesheet({
  content: {
    bgColor: 'elevated',
    textColor: 'default',
    zIndex: 50,
    borderRadius: 'medium',
    borderColor: 'default',
    borderWidth: 'thin',
    padding: 1,
    shadow: 'medium',
    minWidth: '8rem',
    overflow: 'hidden',
    style: {
      transformOrigin: 'var(--radix-context-menu-content-transform-origin)',
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
    textColor: 'default',
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
      transformOrigin: 'var(--radix-context-menu-content-transform-origin)',
      animation: 'fade-in 0.15s ease, zoom-in 0.15s ease',
    },
  },
})

function ContextMenu({
  ...props
}: React.ComponentProps<typeof ContextMenuPrimitive.Root>) {
  return <ContextMenuPrimitive.Root data-slot="context-menu" {...props} />
}

function ContextMenuTrigger({
  ...props
}: React.ComponentProps<typeof ContextMenuPrimitive.Trigger>) {
  return (
    <ContextMenuPrimitive.Trigger data-slot="context-menu-trigger" {...props} />
  )
}

function ContextMenuGroup({
  ...props
}: React.ComponentProps<typeof ContextMenuPrimitive.Group>) {
  return (
    <ContextMenuPrimitive.Group data-slot="context-menu-group" {...props} />
  )
}

function ContextMenuPortal({
  ...props
}: React.ComponentProps<typeof ContextMenuPrimitive.Portal>) {
  return (
    <ContextMenuPrimitive.Portal data-slot="context-menu-portal" {...props} />
  )
}

function ContextMenuSub({
  ...props
}: React.ComponentProps<typeof ContextMenuPrimitive.Sub>) {
  return <ContextMenuPrimitive.Sub data-slot="context-menu-sub" {...props} />
}

function ContextMenuRadioGroup({
  ...props
}: React.ComponentProps<typeof ContextMenuPrimitive.RadioGroup>) {
  return (
    <ContextMenuPrimitive.RadioGroup
      data-slot="context-menu-radio-group"
      {...props}
    />
  )
}

function ContextMenuSubTrigger({
  className,
  inset,
  children,
  ...props
}: React.ComponentProps<typeof ContextMenuPrimitive.SubTrigger> & {
  inset?: boolean
}) {
  const s = useStyles(contextMenuStyles)

  return (
    <ContextMenuPrimitive.SubTrigger
      data-slot="context-menu-sub-trigger"
      data-inset={inset}
      {...s.item.with({ className })}
      {...props}
    >
      {children}
      <ChevronRightIcon className="ml-auto" />
    </ContextMenuPrimitive.SubTrigger>
  )
}

function ContextMenuSubContent({
  className,
  ...props
}: React.ComponentProps<typeof ContextMenuPrimitive.SubContent>) {
  const s = useStyles(contextMenuStyles)

  return (
    <ContextMenuPrimitive.SubContent
      data-slot="context-menu-sub-content"
      {...s.subContent.with({ className })}
      {...props}
    />
  )
}

function ContextMenuContent({
  className,
  ...props
}: React.ComponentProps<typeof ContextMenuPrimitive.Content>) {
  const s = useStyles(contextMenuStyles)

  return (
    <ContextMenuPrimitive.Portal>
      <ContextMenuPrimitive.Content
        data-slot="context-menu-content"
        {...s.content.with({ className })}
        {...props}
      />
    </ContextMenuPrimitive.Portal>
  )
}

function ContextMenuItem({
  className,
  inset,
  variant = "default",
  ...props
}: React.ComponentProps<typeof ContextMenuPrimitive.Item> & {
  inset?: boolean
  variant?: "default" | "destructive"
}) {
  const s = useStyles(contextMenuStyles)

  return (
    <ContextMenuPrimitive.Item
      data-slot="context-menu-item"
      data-inset={inset}
      data-variant={variant}
      {...s.item.with({ className })}
      {...props}
    />
  )
}

function ContextMenuCheckboxItem({
  className,
  children,
  checked,
  ...props
}: React.ComponentProps<typeof ContextMenuPrimitive.CheckboxItem>) {
  const s = useStyles(contextMenuStyles)

  return (
    <ContextMenuPrimitive.CheckboxItem
      data-slot="context-menu-checkbox-item"
      {...s.checkboxItem.with({ className })}
      checked={checked}
      {...props}
    >
      <span {...s.indicator}>
        <ContextMenuPrimitive.ItemIndicator>
          <CheckIcon className="size-4" />
        </ContextMenuPrimitive.ItemIndicator>
      </span>
      {children}
    </ContextMenuPrimitive.CheckboxItem>
  )
}

function ContextMenuRadioItem({
  className,
  children,
  ...props
}: React.ComponentProps<typeof ContextMenuPrimitive.RadioItem>) {
  const s = useStyles(contextMenuStyles)

  return (
    <ContextMenuPrimitive.RadioItem
      data-slot="context-menu-radio-item"
      {...s.checkboxItem.with({ className })}
      {...props}
    >
      <span {...s.indicator}>
        <ContextMenuPrimitive.ItemIndicator>
          <CircleIcon className="size-2 fill-current" />
        </ContextMenuPrimitive.ItemIndicator>
      </span>
      {children}
    </ContextMenuPrimitive.RadioItem>
  )
}

function ContextMenuLabel({
  className,
  inset,
  ...props
}: React.ComponentProps<typeof ContextMenuPrimitive.Label> & {
  inset?: boolean
}) {
  const s = useStyles(contextMenuStyles)

  return (
    <ContextMenuPrimitive.Label
      data-slot="context-menu-label"
      data-inset={inset}
      {...s.label.with({ className })}
      {...props}
    />
  )
}

function ContextMenuSeparator({
  className,
  ...props
}: React.ComponentProps<typeof ContextMenuPrimitive.Separator>) {
  const s = useStyles(contextMenuStyles)

  return (
    <ContextMenuPrimitive.Separator
      data-slot="context-menu-separator"
      {...s.separator.with({ className })}
      {...props}
    />
  )
}

function ContextMenuShortcut({
  className,
  ...props
}: React.ComponentProps<"span">) {
  const s = useStyles(contextMenuStyles)

  return (
    <span
      data-slot="context-menu-shortcut"
      {...s.shortcut.with({ className })}
      {...props}
    />
  )
}

export {
  ContextMenu,
  ContextMenuTrigger,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuCheckboxItem,
  ContextMenuRadioItem,
  ContextMenuLabel,
  ContextMenuSeparator,
  ContextMenuShortcut,
  ContextMenuGroup,
  ContextMenuPortal,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
  ContextMenuRadioGroup,
}
