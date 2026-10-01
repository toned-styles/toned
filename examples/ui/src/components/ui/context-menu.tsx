'use client'

import type { Variants } from '@toned/core'
import { useStyles } from '@toned/react'
import { stylesheet } from '@toned/systems/base'
import { CheckIcon, ChevronRightIcon, CircleIcon } from 'lucide-react'
import { ContextMenu as ContextMenuPrimitive } from 'radix-ui'
import type * as React from 'react'

/*
 * The highlighted, disabled and open states come from Radix data attributes,
 * and the open and close animations from `data-state`: both are structural
 * rules in styles.css.
 */
export const contextMenuStyles = stylesheet({
  content: {
    bgColor: 'elevated',
    textColor: 'default',
    zIndex: 50,
    minWidth: '11rem',
    maxHeight: 'var(--radix-context-menu-content-available-height)',
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
  const s = useStyles(contextMenuStyles, { inset: !!inset })

  return (
    <ContextMenuPrimitive.SubTrigger
      data-slot="context-menu-sub-trigger"
      data-inset={inset}
      {...s.item.with({ className })}
      {...props}
    >
      {children}
      <ChevronRightIcon {...s.subIcon} />
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
      {...s.content.with({ className })}
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
  variant = 'default',
  disabled,
  ...props
}: React.ComponentProps<typeof ContextMenuPrimitive.Item> & {
  inset?: boolean
  variant?: 'default' | 'destructive'
}) {
  const s = useStyles(contextMenuStyles, { inset: !!inset, variant })

  return (
    <ContextMenuPrimitive.Item
      data-slot="context-menu-item"
      data-inset={inset}
      data-variant={variant}
      disabled={disabled}
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
          <CheckIcon />
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
          <CircleIcon {...s.radioIcon} />
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
  const s = useStyles(contextMenuStyles, { inset: !!inset })

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
}: React.ComponentProps<'span'>) {
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
