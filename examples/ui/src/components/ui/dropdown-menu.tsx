"use client"

import * as React from "react"
import { CheckIcon, ChevronRightIcon, CircleIcon } from "lucide-react"
import { DropdownMenu as DropdownMenuPrimitive } from "radix-ui"
import { useStyles } from "@toned/react"
import { stylesheet } from "@toned/systems/base"


const menuStyles = stylesheet({
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
      transformOrigin: 'var(--radix-dropdown-menu-content-transform-origin)',
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
      transformOrigin: 'var(--radix-dropdown-menu-content-transform-origin)',
      animation: 'fade-in 0.15s ease, zoom-in 0.15s ease',
    },
  },
})

function DropdownMenu({
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.Root>) {
  return <DropdownMenuPrimitive.Root data-slot="dropdown-menu" {...props} />
}

function DropdownMenuPortal({
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.Portal>) {
  return (
    <DropdownMenuPrimitive.Portal data-slot="dropdown-menu-portal" {...props} />
  )
}

function DropdownMenuTrigger({
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.Trigger>) {
  return (
    <DropdownMenuPrimitive.Trigger
      data-slot="dropdown-menu-trigger"
      {...props}
    />
  )
}

function DropdownMenuContent({
  className,
  sideOffset = 4,
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.Content>) {
  const s = useStyles(menuStyles)

  return (
    <DropdownMenuPrimitive.Portal>
      <DropdownMenuPrimitive.Content
        data-slot="dropdown-menu-content"
        sideOffset={sideOffset}
        {...s.content.with({ className })}
        {...props}
      />
    </DropdownMenuPrimitive.Portal>
  )
}

function DropdownMenuGroup({
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.Group>) {
  return (
    <DropdownMenuPrimitive.Group data-slot="dropdown-menu-group" {...props} />
  )
}

function DropdownMenuItem({
  className,
  inset,
  variant = "default",
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.Item> & {
  inset?: boolean
  variant?: "default" | "destructive"
}) {
  const s = useStyles(menuStyles)

  return (
    <DropdownMenuPrimitive.Item
      data-slot="dropdown-menu-item"
      data-inset={inset}
      data-variant={variant}
      {...s.item.with({ className })}
      {...props}
    />
  )
}

function DropdownMenuCheckboxItem({
  className,
  children,
  checked,
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.CheckboxItem>) {
  const s = useStyles(menuStyles)

  return (
    <DropdownMenuPrimitive.CheckboxItem
      data-slot="dropdown-menu-checkbox-item"
      {...s.checkboxItem.with({ className })}
      checked={checked}
      {...props}
    >
      <span {...s.indicator}>
        <DropdownMenuPrimitive.ItemIndicator>
          <CheckIcon className="size-4" />
        </DropdownMenuPrimitive.ItemIndicator>
      </span>
      {children}
    </DropdownMenuPrimitive.CheckboxItem>
  )
}

function DropdownMenuRadioGroup({
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.RadioGroup>) {
  return (
    <DropdownMenuPrimitive.RadioGroup
      data-slot="dropdown-menu-radio-group"
      {...props}
    />
  )
}

function DropdownMenuRadioItem({
  className,
  children,
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.RadioItem>) {
  const s = useStyles(menuStyles)

  return (
    <DropdownMenuPrimitive.RadioItem
      data-slot="dropdown-menu-radio-item"
      {...s.checkboxItem.with({ className })}
      {...props}
    >
      <span {...s.indicator}>
        <DropdownMenuPrimitive.ItemIndicator>
          <CircleIcon className="size-2 fill-current" />
        </DropdownMenuPrimitive.ItemIndicator>
      </span>
      {children}
    </DropdownMenuPrimitive.RadioItem>
  )
}

function DropdownMenuLabel({
  className,
  inset,
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.Label> & {
  inset?: boolean
}) {
  const s = useStyles(menuStyles)

  return (
    <DropdownMenuPrimitive.Label
      data-slot="dropdown-menu-label"
      data-inset={inset}
      {...s.label.with({ className })}
      {...props}
    />
  )
}

function DropdownMenuSeparator({
  className,
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.Separator>) {
  const s = useStyles(menuStyles)

  return (
    <DropdownMenuPrimitive.Separator
      data-slot="dropdown-menu-separator"
      {...s.separator.with({ className })}
      {...props}
    />
  )
}

function DropdownMenuShortcut({
  className,
  ...props
}: React.ComponentProps<"span">) {
  const s = useStyles(menuStyles)

  return (
    <span
      data-slot="dropdown-menu-shortcut"
      {...s.shortcut.with({ className })}
      {...props}
    />
  )
}

function DropdownMenuSub({
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.Sub>) {
  return <DropdownMenuPrimitive.Sub data-slot="dropdown-menu-sub" {...props} />
}

function DropdownMenuSubTrigger({
  className,
  inset,
  children,
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.SubTrigger> & {
  inset?: boolean
}) {
  const s = useStyles(menuStyles)

  return (
    <DropdownMenuPrimitive.SubTrigger
      data-slot="dropdown-menu-sub-trigger"
      data-inset={inset}
      {...s.item.with({ className })}
      {...props}
    >
      {children}
      <ChevronRightIcon className="ml-auto size-4" />
    </DropdownMenuPrimitive.SubTrigger>
  )
}

function DropdownMenuSubContent({
  className,
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.SubContent>) {
  const s = useStyles(menuStyles)

  return (
    <DropdownMenuPrimitive.SubContent
      data-slot="dropdown-menu-sub-content"
      {...s.subContent.with({ className })}
      {...props}
    />
  )
}

export {
  DropdownMenu,
  DropdownMenuPortal,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuItem,
  DropdownMenuCheckboxItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
}
