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
    style: {
      maxHeight: '24rem',
      overflow: 'hidden',
      borderWidth: '1px',
      borderStyle: 'solid',
      borderColor: 'color-mix(in srgb, var(--foreground) 10%, transparent)',
    },
  },
  list: {
    style: {
      maxHeight: 'min(calc(24rem - 2.25rem), calc(var(--available-height) - 2.25rem))',
      overflowY: 'auto',
      padding: '0.25rem',
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
    style: {
      width: '100%',
      cursor: 'default',
      paddingTop: '0.375rem',
      paddingBottom: '0.375rem',
      paddingRight: '2rem',
      paddingLeft: '0.5rem',
      outline: 'none',
      userSelect: 'none',
    },
  },
  itemIndicator: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'absolute',
    style: {
      right: '0.5rem',
      width: '1rem',
      height: '1rem',
      pointerEvents: 'none',
    },
  },
  label: {
    textColor: 'muted',
    style: {
      paddingLeft: '0.5rem',
      paddingRight: '0.5rem',
      paddingTop: '0.375rem',
      paddingBottom: '0.375rem',
      fontSize: '0.75rem',
      lineHeight: '1rem',
    },
  },
  empty: {
    textColor: 'muted',
    typo: 'body_small',
    style: {
      display: 'none',
      width: '100%',
      justifyContent: 'center',
      paddingTop: '0.5rem',
      paddingBottom: '0.5rem',
      textAlign: 'center',
    },
  },
  separator: {
    bgColor: 'subtle',
    style: {
      margin: '0.25rem -0.25rem',
      height: '1px',
    },
  },
  triggerIcon: {
    textColor: 'muted',
    style: {
      pointerEvents: 'none',
      width: '1rem',
      height: '1rem',
    },
  },
  chips: {
    borderColor: 'default',
    borderWidth: 'thin',
    borderRadius: 'medium',
    shadow: 'small',
    display: 'flex',
    alignItems: 'center',
    typo: 'body_small',
    style: {
      minHeight: '2.25rem',
      flexWrap: 'wrap',
      gap: '0.375rem',
      background: 'transparent',
      backgroundClip: 'padding-box',
      paddingLeft: '0.625rem',
      paddingRight: '0.625rem',
      paddingTop: '0.375rem',
      paddingBottom: '0.375rem',
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
    style: {
      height: 'calc(1.375rem)',
      width: 'fit-content',
      gap: '0.25rem',
      paddingLeft: '0.375rem',
      paddingRight: '0.375rem',
      fontSize: '0.75rem',
      fontWeight: 500,
      whiteSpace: 'nowrap',
    },
  },
  chipInput: {
    style: {
      minWidth: '4rem',
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
        className={s.triggerIcon.className}
        style={s.triggerIcon.style}
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
          className={cn("group/combobox-content", s.content.className, className)}
          style={{
            ...s.content.style,
            width: 'var(--anchor-width)',
            maxWidth: 'var(--available-width)',
            minWidth: 'calc(var(--anchor-width) + 1.75rem)',
            transformOrigin: 'var(--transform-origin)',
          }}
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
      className={cn(s.list.className, className)}
      style={s.list.style}
      {...props}
    />
  )
}

function ComboboxItem({
  className,
  children,
  ...props
}: ComboboxPrimitive.Item.Props) {
  const s = useStyles(comboboxStyles)

  return (
    <ComboboxPrimitive.Item
      data-slot="combobox-item"
      className={cn(s.item.className, className)}
      style={s.item.style}
      {...props}
    >
      {children}
      <ComboboxPrimitive.ItemIndicator
        data-slot="combobox-item-indicator"
        render={
          <span className={s.itemIndicator.className} style={s.itemIndicator.style} />
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
      className={cn(s.label.className, className)}
      style={s.label.style}
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
      className={cn(s.empty.className, className)}
      style={s.empty.style}
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
      className={cn(s.separator.className, className)}
      style={s.separator.style}
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
      className={cn(s.chips.className, className)}
      style={s.chips.style}
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
      className={cn(s.chip.className, className)}
      style={s.chip.style}
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
      className={cn(s.chipInput.className, className)}
      style={s.chipInput.style}
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
