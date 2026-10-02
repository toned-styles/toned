'use client'

import { overrideStyles, StyleOverrides, useStyles } from '@toned/react'
import { stylesheet } from '@toned/systems/base'
import { Command as CommandPrimitive } from 'cmdk'
import { SearchIcon } from 'lucide-react'
import type * as React from 'react'

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  dialogStyles,
} from '@/components/ui/dialog.tsx'

/*
 * cmdk marks the selected and disabled items and renders the group heading
 * itself, so those rules are keyed on its attributes in styles.css.
 */
export const commandStyles = stylesheet({
  root: {
    bgColor: 'elevated',
    textColor: 'default',
    flexLayout: 'column',
    width: '100%',
    height: '100%',
    borderRadius: 'large',
    overflow: 'hidden',
  },
  inputWrapper: {
    display: 'flex',
    alignItems: 'center',
    gap: 2,
    height: '2.75rem',
    paddingX: 3,
    textColor: 'muted',
    borderColor: 'default',
    // No token sets a single edge.
    $style: { borderBottomWidth: 1 },
  },
  input: {
    flexGrow: '1',
    minWidth: 0,
    height: '100%',
    typo: 'body_small',
    textColor: 'default',
  },
  list: {
    maxHeight: '18rem',
    overflowX: 'hidden',
    overflowY: 'auto',
  },
  empty: {
    paddingY: 6,
    typo: 'body_small',
    textColor: 'muted',
    // No token for text alignment.
    '@platform web': { $style: { textAlign: 'center' } },
  },
  group: {
    padding: 1,
    overflow: 'hidden',
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
    // No token: command text is not selectable.
    '@platform web': { $style: { userSelect: 'none' } },
  },
  separator: {
    borderColor: 'default',
    // No token sets a single edge.
    $style: { borderTopWidth: 1 },
  },
  shortcut: {
    marginLeft: 'auto',
    textColor: 'muted',
    typo: 'caption',
  },
})

// The palette fills the dialog edge to edge, so the dialog drops its padding.
const commandDialogOverrides = [
  overrideStyles(dialogStyles, {
    content: { padding: 0, gap: 0, overflow: 'hidden' },
  }),
]

function Command({
  className,
  ...props
}: React.ComponentProps<typeof CommandPrimitive>) {
  const s = useStyles(commandStyles)

  return (
    <CommandPrimitive
      data-slot="command"
      {...s.root.with({ className })}
      {...props}
    />
  )
}

function CommandDialog({
  title = 'Command Palette',
  description = 'Search for a command to run...',
  children,
  className,
  showCloseButton = true,
  ...props
}: React.ComponentProps<typeof Dialog> & {
  title?: string
  description?: string
  className?: string
  showCloseButton?: boolean
}) {
  return (
    <StyleOverrides value={commandDialogOverrides}>
      <Dialog {...props}>
        <DialogContent className={className} showCloseButton={showCloseButton}>
          <DialogHeader className="sr-only">
            <DialogTitle>{title}</DialogTitle>
            <DialogDescription>{description}</DialogDescription>
          </DialogHeader>
          <Command>{children}</Command>
        </DialogContent>
      </Dialog>
    </StyleOverrides>
  )
}

function CommandInput({
  className,
  ...props
}: React.ComponentProps<typeof CommandPrimitive.Input>) {
  const s = useStyles(commandStyles)

  return (
    <div data-slot="command-input-wrapper" {...s.inputWrapper}>
      <SearchIcon />
      <CommandPrimitive.Input
        data-slot="command-input"
        {...s.input.with({ className })}
        {...props}
      />
    </div>
  )
}

function CommandList({
  className,
  ...props
}: React.ComponentProps<typeof CommandPrimitive.List>) {
  const s = useStyles(commandStyles)

  return (
    <CommandPrimitive.List
      data-slot="command-list"
      {...s.list.with({ className })}
      {...props}
    />
  )
}

function CommandEmpty({
  ...props
}: React.ComponentProps<typeof CommandPrimitive.Empty>) {
  const s = useStyles(commandStyles)

  return (
    <CommandPrimitive.Empty data-slot="command-empty" {...s.empty} {...props} />
  )
}

function CommandGroup({
  className,
  ...props
}: React.ComponentProps<typeof CommandPrimitive.Group>) {
  const s = useStyles(commandStyles)

  return (
    <CommandPrimitive.Group
      data-slot="command-group"
      {...s.group.with({ className })}
      {...props}
    />
  )
}

function CommandSeparator({
  className,
  ...props
}: React.ComponentProps<typeof CommandPrimitive.Separator>) {
  const s = useStyles(commandStyles)

  return (
    <CommandPrimitive.Separator
      data-slot="command-separator"
      {...s.separator.with({ className })}
      {...props}
    />
  )
}

function CommandItem({
  className,
  disabled,
  ...props
}: React.ComponentProps<typeof CommandPrimitive.Item>) {
  const s = useStyles(commandStyles)

  return (
    <CommandPrimitive.Item
      data-slot="command-item"
      disabled={disabled}
      {...s.item.with({ className })}
      {...props}
    />
  )
}

function CommandShortcut({
  className,
  ...props
}: React.ComponentProps<'span'>) {
  const s = useStyles(commandStyles)

  return (
    <span
      data-slot="command-shortcut"
      {...s.shortcut.with({ className })}
      {...props}
    />
  )
}

export {
  Command,
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandShortcut,
  CommandSeparator,
}
