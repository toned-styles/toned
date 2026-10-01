'use client'

import type { Variants } from '@toned/core'
import { useStyles } from '@toned/react'
import { stylesheet } from '@toned/systems/base'
import { CheckIcon, ChevronRightIcon, CircleIcon } from 'lucide-react'
import { DropdownMenu as DropdownMenuPrimitive } from 'radix-ui'
import type * as React from 'react'

/*
 * The highlighted, disabled and open states come from Radix data attributes,
 * and the open and close animations from `data-state`: both are structural
 * rules in styles.css.
 */
export const menuStyles = stylesheet({
  content: {
    bgColor: 'elevated',
    textColor: 'default',
    zIndex: 50,
    minWidth: '11rem',
    maxHeight: 'var(--radix-dropdown-menu-content-available-height)',
    padding: 1,
    borderRadius: 'large',
    borderColor: 'default',
    borderWidth: 'thin',
    shadow: 'large',
    overflowX: 'hidden',
    overflowY: 'auto',
  },
  item: {
    display: 'flex',
    alignItems: 'center',
    gap: 2,
    position: 'relative',
    paddingX: 2,
    paddingY: 1.5,
    borderRadius: 'medium',
    typo: 'body_small',
    cursor: 'default',
    // No token: menu text is not selectable.
    style: { userSelect: 'none' },
  },
  checkboxItem: {
    display: 'flex',
    alignItems: 'center',
    gap: 2,
    position: 'relative',
    paddingY: 1.5,
    paddingRight: 2,
    paddingLeft: 8,
    borderRadius: 'medium',
    typo: 'body_small',
    cursor: 'default',
    // No token: menu text is not selectable.
    style: { userSelect: 'none' },
  },
  indicator: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'absolute',
    left: 2,
    width: '1rem',
    height: '1rem',
    pointerEvents: 'none',
  },
  radioIcon: {
    width: '0.5rem',
    height: '0.5rem',
    svgFill: 'current',
  },
  label: {
    paddingX: 2,
    paddingY: 1.5,
    typo: 'caption',
    textColor: 'muted',
    fontWeight: 500,
  },
  separator: {
    borderColor: 'default',
    marginY: 1,
    marginX: -1,
    // No token sets a single edge.
    style: { borderTopWidth: 1 },
  },
  shortcut: {
    marginLeft: 'auto',
    paddingLeft: 4,
    textColor: 'muted',
    typo: 'caption',
  },
  subIcon: {
    marginLeft: 'auto',
    textColor: 'muted',
  },
}).variants(
  (
    $: Variants<{
      inset: boolean
      variant: 'default' | 'destructive'
    }>,
  ) => ({
    [$.inset(true)]: {
      item: { paddingLeft: 8 },
      label: { paddingLeft: 8 },
    },
    [$.variant('destructive')]: {
      item: { textColor: 'destructive' },
    },
  }),
  { defaults: { inset: false, variant: 'default' } },
)

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
  variant = 'default',
  disabled,
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.Item> & {
  inset?: boolean
  variant?: 'default' | 'destructive'
}) {
  const s = useStyles(menuStyles, { inset: !!inset, variant })

  return (
    <DropdownMenuPrimitive.Item
      data-slot="dropdown-menu-item"
      data-inset={inset}
      data-variant={variant}
      disabled={disabled}
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
          <CheckIcon />
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
          <CircleIcon {...s.radioIcon} />
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
  const s = useStyles(menuStyles, { inset: !!inset })

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
}: React.ComponentProps<'span'>) {
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
  const s = useStyles(menuStyles, { inset: !!inset })

  return (
    <DropdownMenuPrimitive.SubTrigger
      data-slot="dropdown-menu-sub-trigger"
      data-inset={inset}
      {...s.item.with({ className })}
      {...props}
    >
      {children}
      <ChevronRightIcon {...s.subIcon} />
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
      {...s.content.with({ className })}
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
