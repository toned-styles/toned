'use client'

import type { Variants } from '@toned/core'
import { useStyles } from '@toned/react'
import { stylesheet } from '@toned/systems/base'
import { CheckIcon, ChevronDownIcon, ChevronUpIcon } from 'lucide-react'
import { Select as SelectPrimitive } from 'radix-ui'
import type * as React from 'react'

/*
 * Highlighted items, the open and close animations and the rotated chevron are
 * keyed on Radix data attributes in styles.css.
 */
export const selectStyles = stylesheet({
  trigger: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 2,
    width: 'fit-content',
    paddingX: 3,
    bgColor: 'default',
    textColor: 'default',
    borderColor: 'input',
    borderWidth: 'thin',
    borderRadius: 'medium',
    typo: 'body_small',
    shadow: 'small',
    cursor: 'pointer',
    // No tokens for text wrapping or transitions.
    '@platform web': {
      $style: {
        whiteSpace: 'nowrap',
        transition: 'border-color 0.15s, box-shadow 0.15s',
      },
    },
    ':focus-visible': { borderColor: 'action', shadow: 'focus' },
  },
  icon: {
    textColor: 'muted',
    // The open state rotates the icon from styles.css.
    '@platform web': { $style: { transition: 'transform 0.15s' } },
  },
  content: {
    bgColor: 'elevated',
    textColor: 'default',
    position: 'relative',
    zIndex: 50,
    minWidth: '8rem',
    maxHeight: 'var(--radix-select-content-available-height)',
    borderRadius: 'large',
    borderColor: 'default',
    borderWidth: 'thin',
    shadow: 'large',
    overflowX: 'hidden',
    overflowY: 'auto',
  },
  viewport: {
    padding: 1,
  },
  item: {
    display: 'flex',
    alignItems: 'center',
    gap: 2,
    position: 'relative',
    width: '100%',
    paddingY: 1.5,
    paddingLeft: 2,
    paddingRight: 8,
    borderRadius: 'medium',
    typo: 'body_small',
    cursor: 'default',
    // No token: option text is not selectable.
    '@platform web': { $style: { userSelect: 'none' } },
  },
  itemIndicator: {
    position: 'absolute',
    right: 2,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    textColor: 'action',
  },
  label: {
    textColor: 'muted',
    paddingX: 2,
    paddingY: 1.5,
    typo: 'caption',
  },
  separator: {
    borderColor: 'default',
    marginY: 1,
    marginX: -1,
    // No token sets a single edge.
    $style: { borderTopWidth: 1 },
  },
  scrollButton: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    paddingY: 1,
    textColor: 'muted',
    cursor: 'default',
  },
}).variants(
  (
    $: Variants<{
      size: 'sm' | 'default'
      disabled: boolean
      position: 'item-aligned' | 'popper'
    }>,
  ) => ({
    [$.size('default')]: { trigger: { height: '2.25rem' } },
    [$.size('sm')]: { trigger: { height: '2rem' } },
    [$.disabled(true)]: {
      trigger: { cursor: 'not-allowed', opacity: 0.5 },
    },
    [$.position('popper')]: {
      viewport: { minWidth: 'var(--radix-select-trigger-width)' },
    },
  }),
  { defaults: { size: 'default', disabled: false, position: 'popper' } },
)

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
  size = 'default',
  disabled,
  children,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Trigger> & {
  size?: 'sm' | 'default'
}) {
  const s = useStyles(selectStyles, { size, disabled: !!disabled })

  return (
    <SelectPrimitive.Trigger
      data-slot="select-trigger"
      data-size={size}
      disabled={disabled}
      {...s.trigger.with({ className })}
      {...props}
    >
      {children}
      <SelectPrimitive.Icon asChild>
        <ChevronDownIcon data-slot="select-icon" {...s.icon} />
      </SelectPrimitive.Icon>
    </SelectPrimitive.Trigger>
  )
}

function SelectContent({
  className,
  children,
  position = 'popper',
  sideOffset = 4,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Content>) {
  const s = useStyles(selectStyles, { position })

  return (
    <SelectPrimitive.Portal>
      <SelectPrimitive.Content
        data-slot="select-content"
        {...s.content.with({ className })}
        position={position}
        sideOffset={sideOffset}
        {...props}
      >
        <SelectScrollUpButton />
        <SelectPrimitive.Viewport data-slot="select-viewport" {...s.viewport}>
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
      <span data-slot="select-item-indicator" {...s.itemIndicator}>
        <SelectPrimitive.ItemIndicator>
          <CheckIcon />
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
      <ChevronUpIcon />
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
      <ChevronDownIcon />
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
