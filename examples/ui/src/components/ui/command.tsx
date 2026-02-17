"use client"

import * as React from "react"
import { Command as CommandPrimitive } from "cmdk"
import { SearchIcon } from "lucide-react"
import { useStyles } from "@toned/react"
import { stylesheet } from "@toned/systems/base"

import { cn } from "@/lib/utils"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

const commandStyles = stylesheet({
  root: {
    bgColor: 'elevated',
    textColor: 'default',
    display: 'flex',
    flexLayout: 'column',
    width: '100%',
    borderRadius: 'medium',
    style: {
      height: '100%',
      overflow: 'hidden',
    },
  },
  inputWrapper: {
    display: 'flex',
    alignItems: 'center',
    gap: 2,
    borderColor: 'default',
    paddingX: 3,
    style: {
      height: '2.25rem',
      borderBottom: '1px solid var(--border)',
    },
  },
  input: {
    display: 'flex',
    width: '100%',
    typo: 'body_small',
    style: {
      height: '2.5rem',
      background: 'transparent',
      padding: '0.75rem 0',
      outline: 'none',
      border: 'none',
    },
  },
  list: {
    style: {
      maxHeight: '300px',
      overflowX: 'hidden',
      overflowY: 'auto',
      scrollPaddingBlock: '0.25rem',
    },
  },
  empty: {
    paddingY: 6,
    typo: 'body_small',
    style: {
      textAlign: 'center',
    },
  },
  group: {
    textColor: 'default',
    padding: 1,
    style: {
      overflow: 'hidden',
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
    style: {
      position: 'relative',
      cursor: 'default',
      outline: 'none',
      userSelect: 'none',
    },
  },
  separator: {
    bgColor: 'subtle',
    style: {
      margin: '0 -0.25rem',
      height: '1px',
    },
  },
  shortcut: {
    textColor: 'muted',
    typo: 'caption',
    style: {
      marginLeft: 'auto',
      letterSpacing: '0.1em',
    },
  },
})

function Command({
  className,
  ...props
}: React.ComponentProps<typeof CommandPrimitive>) {
  const s = useStyles(commandStyles)

  return (
    <CommandPrimitive
      data-slot="command"
      className={cn(s.root.className, className)}
      style={s.root.style}
      {...props}
    />
  )
}

function CommandDialog({
  title = "Command Palette",
  description = "Search for a command to run...",
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
    <Dialog {...props}>
      <DialogHeader className="sr-only">
        <DialogTitle>{title}</DialogTitle>
        <DialogDescription>{description}</DialogDescription>
      </DialogHeader>
      <DialogContent
        className={cn(className)}
        style={{ overflow: 'hidden', padding: 0 }}
        showCloseButton={showCloseButton}
      >
        <Command>
          {children}
        </Command>
      </DialogContent>
    </Dialog>
  )
}

function CommandInput({
  className,
  ...props
}: React.ComponentProps<typeof CommandPrimitive.Input>) {
  const s = useStyles(commandStyles)

  return (
    <div
      data-slot="command-input-wrapper"
      className={s.inputWrapper.className}
      style={s.inputWrapper.style}
    >
      <SearchIcon className="size-4 shrink-0 opacity-50" />
      <CommandPrimitive.Input
        data-slot="command-input"
        className={cn(s.input.className, className)}
        style={s.input.style}
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
      className={cn(s.list.className, className)}
      style={s.list.style}
      {...props}
    />
  )
}

function CommandEmpty({
  ...props
}: React.ComponentProps<typeof CommandPrimitive.Empty>) {
  const s = useStyles(commandStyles)

  return (
    <CommandPrimitive.Empty
      data-slot="command-empty"
      className={s.empty.className}
      style={s.empty.style}
      {...props}
    />
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
      className={cn(s.group.className, className)}
      style={s.group.style}
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
      className={cn(s.separator.className, className)}
      style={s.separator.style}
      {...props}
    />
  )
}

function CommandItem({
  className,
  ...props
}: React.ComponentProps<typeof CommandPrimitive.Item>) {
  const s = useStyles(commandStyles)

  return (
    <CommandPrimitive.Item
      data-slot="command-item"
      className={cn(s.item.className, className)}
      style={s.item.style}
      {...props}
    />
  )
}

function CommandShortcut({
  className,
  ...props
}: React.ComponentProps<"span">) {
  const s = useStyles(commandStyles)

  return (
    <span
      data-slot="command-shortcut"
      className={cn(s.shortcut.className, className)}
      style={s.shortcut.style}
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
