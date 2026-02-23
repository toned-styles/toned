"use client"

import * as React from "react"
import { CheckIcon, ChevronDownIcon, ChevronUpIcon } from "lucide-react"
import { Select as SelectPrimitive } from "radix-ui"
import { useStyles } from "@toned/react"
import { stylesheet } from "@toned/systems/base"


const selectStyles = stylesheet({
  trigger: {
    borderColor: 'input',
    borderWidth: 'thin',
    borderRadius: 'medium',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 2,
    paddingX: 3,
    paddingY: 2,
    typo: 'body_small',
    shadow: 'small',
    width: 'fit-content',
    style: {
      backgroundColor: 'transparent',
      whiteSpace: 'nowrap' as const,
      outline: 'none',
      transition: 'color 0.15s, box-shadow 0.15s',
    },
  },
  triggerDisabled: {
    cursor: 'not-allowed',
    opacity: 0.5,
  },
  content: {
    bgColor: 'elevated',
    textColor: 'default',
    position: 'relative',
    zIndex: 50,
    borderRadius: 'medium',
    borderColor: 'default',
    borderWidth: 'thin',
    shadow: 'medium',
    overflow: 'hidden',
    minWidth: '8rem',
    overflowX: 'hidden',
    overflowY: 'auto',
    maxHeight: 'var(--radix-select-content-available-height)',
    style: {
      transformOrigin: 'var(--radix-select-content-transform-origin)',
    },
  },
  item: {
    display: 'flex',
    alignItems: 'center',
    gap: 2,
    borderRadius: 'small',
    paddingY: 1.5,
    paddingLeft: 2,
    paddingRight: 8,
    typo: 'body_small',
    position: 'relative',
    width: '100%',
    cursor: 'default',
    style: {
      outline: 'none',
      userSelect: 'none',
    },
  },
  label: {
    textColor: 'muted',
    paddingX: 2,
    paddingY: 1.5,
    typo: 'caption',
  },
  separator: {
    bgColor: 'subtle',
    height: '1px',
    marginY: 1,
    marginX: -1,
    pointerEvents: 'none',
  },
  scrollButton: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    paddingY: 1,
    cursor: 'default',
  },
})

function Select({
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Root>) {
  return <SelectPrimitive.Root data-slot="select" {...props} />
}

function SelectGroup({
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Group>) {
  return <SelectPrimitive.Group data-slot="select-group" {...props} />
}

function SelectValue({
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Value>) {
  return <SelectPrimitive.Value data-slot="select-value" {...props} />
}

function SelectTrigger({
  className,
  size = "default",
  disabled,
  children,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Trigger> & {
  size?: "sm" | "default"
}) {
  const s = useStyles(selectStyles)

  return (
    <SelectPrimitive.Trigger
      data-slot="select-trigger"
      data-size={size}
      disabled={disabled}
      {...s.trigger.with(disabled && s.triggerDisabled).with({ className })}
      {...props}
    >
      {children}
      <SelectPrimitive.Icon asChild>
        <ChevronDownIcon className="size-4 opacity-50" />
      </SelectPrimitive.Icon>
    </SelectPrimitive.Trigger>
  )
}

function SelectContent({
  className,
  children,
  position = "item-aligned",
  align = "center",
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Content>) {
  const s = useStyles(selectStyles)

  return (
    <SelectPrimitive.Portal>
      <SelectPrimitive.Content
        data-slot="select-content"
        {...s.content.with({ className })}
        position={position}
        align={align}
        {...props}
      >
        <SelectScrollUpButton />
        <SelectPrimitive.Viewport
          data-slot="select-viewport"
          style={{
            padding: '4px',
            ...(position === "popper" ? {
              height: 'var(--radix-select-trigger-height)',
              width: '100%',
              minWidth: 'var(--radix-select-trigger-width)',
            } : {}),
          }}
        >
          {children}
        </SelectPrimitive.Viewport>
        <SelectScrollDownButton />
      </SelectPrimitive.Content>
    </SelectPrimitive.Portal>
  )
}

function SelectLabel({
  className,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Label>) {
  const s = useStyles(selectStyles)

  return (
    <SelectPrimitive.Label
      data-slot="select-label"
      {...s.label.with({ className })}
      {...props}
    />
  )
}

function SelectItem({
  className,
  children,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Item>) {
  const s = useStyles(selectStyles)

  return (
    <SelectPrimitive.Item
      data-slot="select-item"
      {...s.item.with({ className })}
      {...props}
    >
      <span
        data-slot="select-item-indicator"
        style={{
          position: 'absolute',
          right: '8px',
          display: 'flex',
          width: '0.875rem',
          height: '0.875rem',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <SelectPrimitive.ItemIndicator>
          <CheckIcon className="size-4" />
        </SelectPrimitive.ItemIndicator>
      </span>
      <SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
    </SelectPrimitive.Item>
  )
}

function SelectSeparator({
  className,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Separator>) {
  const s = useStyles(selectStyles)

  return (
    <SelectPrimitive.Separator
      data-slot="select-separator"
      {...s.separator.with({ className })}
      {...props}
    />
  )
}

function SelectScrollUpButton({
  className,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.ScrollUpButton>) {
  const s = useStyles(selectStyles)

  return (
    <SelectPrimitive.ScrollUpButton
      data-slot="select-scroll-up-button"
      {...s.scrollButton.with({ className })}
      {...props}
    >
      <ChevronUpIcon className="size-4" />
    </SelectPrimitive.ScrollUpButton>
  )
}

function SelectScrollDownButton({
  className,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.ScrollDownButton>) {
  const s = useStyles(selectStyles)

  return (
    <SelectPrimitive.ScrollDownButton
      data-slot="select-scroll-down-button"
      {...s.scrollButton.with({ className })}
      {...props}
    >
      <ChevronDownIcon className="size-4" />
    </SelectPrimitive.ScrollDownButton>
  )
}

export {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectScrollDownButton,
  SelectScrollUpButton,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
}
