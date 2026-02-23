"use client"

import * as React from "react"
import { Combobox as ComboboxPrimitive } from "@base-ui/react"
import { CheckIcon, ChevronDownIcon, XIcon } from "lucide-react"
import { useStyles } from "@toned/react"
import { stylesheet } from "@toned/systems/base"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "@/components/ui/input-group"

const comboboxStyles = stylesheet({
  content: {
    bgColor: 'elevated',
    textColor: 'default',
    zIndex: 50,
    borderRadius: 'medium',
    shadow: 'medium',
    position: 'relative',
    overflow: 'hidden',
    style: {
      maxHeight: '24rem',
      borderWidth: '1px',
      borderStyle: 'solid',
      borderColor: 'color-mix(in srgb, var(--foreground) 10%, transparent)',
    },
  },
  list: {
    overflowY: 'auto',
    maxHeight: 'min(calc(24rem - 2.25rem), calc(var(--available-height) - 2.25rem))',
    padding: 1,
    style: {
      scrollPaddingBlock: '0.25rem',
    },
  },
  item: {
    display: 'flex',
    alignItems: 'center',
    gap: 2,
    borderRadius: 'small',
    typo: 'body_small',
    position: 'relative',
    width: '100%',
    cursor: 'default',
    paddingTop: 1.5,
    paddingBottom: 1.5,
    paddingRight: 8,
    paddingLeft: 2,
    style: {
      outline: 'none',
      userSelect: 'none',
    },
  },
  itemDisabled: {
    pointerEvents: 'none',
    opacity: 0.5,
  },
  itemIndicator: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'absolute',
    pointerEvents: 'none',
    right: '0.5rem',
    width: '1rem',
    height: '1rem',
  },
  label: {
    textColor: 'muted',
    fontSize: '0.75rem',
    lineHeight: '1rem',
    paddingX: 2,
    paddingY: 1.5,
  },
  empty: {
    textColor: 'muted',
    typo: 'body_small',
    display: 'none',
    width: '100%',
    justifyContent: 'center',
    paddingY: 2,
    style: {
      textAlign: 'center',
    },
  },
  separator: {
    bgColor: 'subtle',
    height: '1px',
    marginY: 1,
    marginX: -1,
  },
  triggerIcon: {
    textColor: 'muted',
    pointerEvents: 'none',
    width: '1rem',
    height: '1rem',
  },
  chips: {
    borderColor: 'default',
    borderWidth: 'thin',
    borderRadius: 'medium',
    shadow: 'small',
    display: 'flex',
    alignItems: 'center',
    typo: 'body_small',
    minHeight: '2.25rem',
    flexWrap: 'wrap',
    gap: 1.5,
    paddingX: 2.5,
    paddingY: 1.5,
    style: {
      background: 'transparent',
      backgroundClip: 'padding-box',
      transition: 'color 0.15s, box-shadow 0.15s',
    },
  },
  chip: {
    bgColor: 'action_secondary',
    textColor: 'default',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 'small',
    width: 'fit-content',
    fontSize: '0.75rem',
    fontWeight: 500,
    height: '1.375rem',
    gap: 1,
    paddingX: 1.5,
    style: {
      whiteSpace: 'nowrap',
    },
  },
  chipInput: {
    minWidth: '4rem',
    style: {
      flex: 1,
      outline: 'none',
    },
  },
})

const Combobox = ComboboxPrimitive.Root

function ComboboxValue({ ...props }: ComboboxPrimitive.Value.Props) {
  return <ComboboxPrimitive.Value data-slot="combobox-value" {...props} />
}

function ComboboxTrigger({
  className,
  children,
  ...props
}: ComboboxPrimitive.Trigger.Props) {
  const s = useStyles(comboboxStyles)

  return (
    <ComboboxPrimitive.Trigger
      data-slot="combobox-trigger"
      className={cn(className)}
      {...props}
    >
      {children}
      <ChevronDownIcon
        data-slot="combobox-trigger-icon"
        {...s.triggerIcon}
      />
    </ComboboxPrimitive.Trigger>
  )
}

function ComboboxClear({ className, ...props }: ComboboxPrimitive.Clear.Props) {
  return (
    <ComboboxPrimitive.Clear
      data-slot="combobox-clear"
      render={<InputGroupButton variant="ghost" size="icon-xs" />}
      className={cn(className)}
      {...props}
    >
      <XIcon style={{ pointerEvents: 'none' }} />
    </ComboboxPrimitive.Clear>
  )
}

function ComboboxInput({
  className,
  children,
  disabled = false,
  showTrigger = true,
  showClear = false,
  ...props
}: ComboboxPrimitive.Input.Props & {
  showTrigger?: boolean
  showClear?: boolean
}) {
  return (
    <InputGroup className={cn(className)} style={{ width: 'auto' }}>
      <ComboboxPrimitive.Input
        render={<InputGroupInput disabled={disabled} />}
        {...props}
      />
      <InputGroupAddon align="inline-end">
        {showTrigger && (
          <InputGroupButton
            size="icon-xs"
            variant="ghost"
            asChild
            data-slot="input-group-button"
            disabled={disabled}
          >
            <ComboboxTrigger />
          </InputGroupButton>
        )}
        {showClear && <ComboboxClear disabled={disabled} />}
      </InputGroupAddon>
      {children}
    </InputGroup>
  )
}

function ComboboxContent({
  className,
  side = "bottom",
  sideOffset = 6,
  align = "start",
  alignOffset = 0,
  anchor,
  ...props
}: ComboboxPrimitive.Popup.Props &
  Pick<
    ComboboxPrimitive.Positioner.Props,
    "side" | "align" | "sideOffset" | "alignOffset" | "anchor"
  >) {
  const s = useStyles(comboboxStyles)

  return (
    <ComboboxPrimitive.Portal>
      <ComboboxPrimitive.Positioner
        side={side}
        sideOffset={sideOffset}
        align={align}
        alignOffset={alignOffset}
        anchor={anchor}
        style={{ isolation: 'isolate', zIndex: 50 }}
      >
        <ComboboxPrimitive.Popup
          data-slot="combobox-content"
          data-chips={!!anchor}
          {...s.content.with({
            className: cn("group/combobox-content", className),
            style: {
              width: 'var(--anchor-width)',
              maxWidth: 'var(--available-width)',
              minWidth: 'calc(var(--anchor-width) + 1.75rem)',
              transformOrigin: 'var(--transform-origin)',
            },
          })}
          {...props}
        />
      </ComboboxPrimitive.Positioner>
    </ComboboxPrimitive.Portal>
  )
}

function ComboboxList({ className, ...props }: ComboboxPrimitive.List.Props) {
  const s = useStyles(comboboxStyles)

  return (
    <ComboboxPrimitive.List
      data-slot="combobox-list"
      {...s.list.with({ className })}
      {...props}
    />
  )
}

function ComboboxItem({
  className,
  children,
  disabled,
  ...props
}: ComboboxPrimitive.Item.Props) {
  const s = useStyles(comboboxStyles)

  return (
    <ComboboxPrimitive.Item
      data-slot="combobox-item"
      disabled={disabled}
      {...s.item.with(disabled && s.itemDisabled).with({ className })}
      {...props}
    >
      {children}
      <ComboboxPrimitive.ItemIndicator
        data-slot="combobox-item-indicator"
        render={
          <span {...s.itemIndicator} />
        }
      >
        <CheckIcon style={{ pointerEvents: 'none', width: '1rem', height: '1rem' }} />
      </ComboboxPrimitive.ItemIndicator>
    </ComboboxPrimitive.Item>
  )
}

function ComboboxGroup({ className, ...props }: ComboboxPrimitive.Group.Props) {
  return (
    <ComboboxPrimitive.Group
      data-slot="combobox-group"
      className={cn(className)}
      {...props}
    />
  )
}

function ComboboxLabel({
  className,
  ...props
}: ComboboxPrimitive.GroupLabel.Props) {
  const s = useStyles(comboboxStyles)

  return (
    <ComboboxPrimitive.GroupLabel
      data-slot="combobox-label"
      {...s.label.with({ className })}
      {...props}
    />
  )
}

function ComboboxCollection({ ...props }: ComboboxPrimitive.Collection.Props) {
  return (
    <ComboboxPrimitive.Collection data-slot="combobox-collection" {...props} />
  )
}

function ComboboxEmpty({ className, ...props }: ComboboxPrimitive.Empty.Props) {
  const s = useStyles(comboboxStyles)

  return (
    <ComboboxPrimitive.Empty
      data-slot="combobox-empty"
      {...s.empty.with({ className })}
      {...props}
    />
  )
}

function ComboboxSeparator({
  className,
  ...props
}: ComboboxPrimitive.Separator.Props) {
  const s = useStyles(comboboxStyles)

  return (
    <ComboboxPrimitive.Separator
      data-slot="combobox-separator"
      {...s.separator.with({ className })}
      {...props}
    />
  )
}

function ComboboxChips({
  className,
  ...props
}: React.ComponentPropsWithRef<typeof ComboboxPrimitive.Chips> &
  ComboboxPrimitive.Chips.Props) {
  const s = useStyles(comboboxStyles)

  return (
    <ComboboxPrimitive.Chips
      data-slot="combobox-chips"
      {...s.chips.with({ className })}
      {...props}
    />
  )
}

function ComboboxChip({
  className,
  children,
  showRemove = true,
  ...props
}: ComboboxPrimitive.Chip.Props & {
  showRemove?: boolean
}) {
  const s = useStyles(comboboxStyles)

  return (
    <ComboboxPrimitive.Chip
      data-slot="combobox-chip"
      {...s.chip.with({ className })}
      {...props}
    >
      {children}
      {showRemove && (
        <ComboboxPrimitive.ChipRemove
          render={<Button variant="ghost" size="icon-xs" />}
          style={{ marginLeft: '-0.25rem', opacity: 0.5 }}
          data-slot="combobox-chip-remove"
        >
          <XIcon style={{ pointerEvents: 'none' }} />
        </ComboboxPrimitive.ChipRemove>
      )}
    </ComboboxPrimitive.Chip>
  )
}

function ComboboxChipsInput({
  className,
  children,
  ...props
}: ComboboxPrimitive.Input.Props) {
  const s = useStyles(comboboxStyles)

  return (
    <ComboboxPrimitive.Input
      data-slot="combobox-chip-input"
      {...s.chipInput.with({ className })}
      {...props}
    />
  )
}

function useComboboxAnchor() {
  return React.useRef<HTMLDivElement | null>(null)
}

export {
  Combobox,
  ComboboxInput,
  ComboboxContent,
  ComboboxList,
  ComboboxItem,
  ComboboxGroup,
  ComboboxLabel,
  ComboboxCollection,
  ComboboxEmpty,
  ComboboxSeparator,
  ComboboxChips,
  ComboboxChip,
  ComboboxChipsInput,
  ComboboxTrigger,
  ComboboxValue,
  useComboboxAnchor,
}
