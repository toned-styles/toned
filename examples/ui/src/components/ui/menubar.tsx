'use client'

import type { Variants } from '@toned/core'
import { useStyles } from '@toned/react'
import { stylesheet } from '@toned/systems/base'
import { CheckIcon, ChevronRightIcon, CircleIcon } from 'lucide-react'
import { Menubar as MenubarPrimitive } from 'radix-ui'
import type * as React from 'react'

/*
 * The highlighted, disabled and open states come from Radix data attributes,
 * and the open and close animations from `data-state`: both are structural
 * rules in styles.css.
 */
export const menubarStyles = stylesheet({
  root: {
    display: 'flex',
    alignItems: 'center',
    gap: 1,
    width: 'fit-content',
    height: '2.5rem',
    padding: 1,
    bgColor: 'default',
    borderColor: 'input',
    borderWidth: 'thin',
    borderRadius: 'large',
    shadow: 'small',
  },
  trigger: {
    display: 'flex',
    alignItems: 'center',
    height: '100%',
    paddingX: 3,
    borderRadius: 'medium',
    typo: 'label_small',
    textColor: 'default',
    cursor: 'default',
    // No token: menu text is not selectable.
    '@platform web': {
      $style: { userSelect: 'none', transition: 'background-color 0.15s' },
    },
  },
  content: {
    bgColor: 'elevated',
    textColor: 'default',
    zIndex: 50,
    minWidth: '11rem',
    maxHeight: 'var(--radix-menubar-content-available-height)',
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
    '@platform web': { $style: { userSelect: 'none' } },
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
    '@platform web': { $style: { userSelect: 'none' } },
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
    $style: { borderTopWidth: 1 },
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
  align = 'start',
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
  variant = 'default',
  disabled,
  ...props
}: React.ComponentProps<typeof MenubarPrimitive.Item> & {
  inset?: boolean
  variant?: 'default' | 'destructive'
}) {
  const s = useStyles(menubarStyles, { inset: !!inset, variant })

  return (
    <MenubarPrimitive.Item
      data-slot="menubar-item"
      data-inset={inset}
      data-variant={variant}
      disabled={disabled}
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
          <CheckIcon />
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
          <CircleIcon {...s.radioIcon} />
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
  const s = useStyles(menubarStyles, { inset: !!inset })

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
}: React.ComponentProps<'span'>) {
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
  const s = useStyles(menubarStyles, { inset: !!inset })

  return (
    <MenubarPrimitive.SubTrigger
      data-slot="menubar-sub-trigger"
      data-inset={inset}
      {...s.item.with({ className })}
      {...props}
    >
      {children}
      <ChevronRightIcon {...s.subIcon} />
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
      {...s.content.with({ className })}
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
