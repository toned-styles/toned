'use client'

import { Combobox as ComboboxPrimitive } from '@base-ui/react'
import { useStyles } from '@toned/react'
import { stylesheet } from '@toned/systems/base'
import { CheckIcon, ChevronDownIcon, XIcon } from 'lucide-react'
import * as React from 'react'
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from '@/components/ui/input-group.tsx'

/*
 * The highlighted item, the empty state and the open and close animations are
 * keyed on Base UI data attributes in styles.css.
 */
export const comboboxStyles = stylesheet({
  content: {
    bgColor: 'elevated',
    textColor: 'default',
    position: 'relative',
    zIndex: 50,
    width: 'var(--anchor-width)',
    minWidth: '12rem',
    maxWidth: 'var(--available-width)',
    maxHeight: '20rem',
    borderRadius: 'large',
    borderColor: 'default',
    borderWidth: 'thin',
    shadow: 'large',
    overflow: 'hidden',
  },
  positioner: {
    zIndex: 50,
  },
  list: {
    maxHeight: 'min(20rem, var(--available-height))',
    padding: 1,
    overflowY: 'auto',
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
    style: { userSelect: 'none' },
  },
  itemIndicator: {
    position: 'absolute',
    right: 2,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    textColor: 'action',
    pointerEvents: 'none',
  },
  label: {
    textColor: 'muted',
    typo: 'caption',
    fontWeight: 500,
    paddingX: 2,
    paddingY: 1.5,
  },
  // Shown from styles.css when the popup reports an empty list.
  empty: {
    display: 'none',
    justifyContent: 'center',
    width: '100%',
    paddingY: 4,
    textColor: 'muted',
    typo: 'body_small',
  },
  separator: {
    borderColor: 'default',
    marginY: 1,
    marginX: -1,
    // No token sets a single edge.
    style: { borderTopWidth: 1 },
  },
  trigger: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
  },
  triggerIcon: {
    textColor: 'muted',
  },
  chips: {
    display: 'flex',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 1.5,
    minHeight: '2.25rem',
    paddingX: 2,
    paddingY: 1.5,
    bgColor: 'default',
    borderColor: 'input',
    borderWidth: 'thin',
    borderRadius: 'medium',
    shadow: 'small',
    typo: 'body_small',
    // No token: the transition list is specific to this control.
    style: { transition: 'border-color 0.15s, box-shadow 0.15s' },
    ':focus-within': { borderColor: 'action', shadow: 'focus' },
  },
  chip: {
    display: 'flex',
    alignItems: 'center',
    gap: 1,
    width: 'fit-content',
    height: '1.375rem',
    paddingLeft: 2,
    paddingRight: 0.5,
    bgColor: 'action_secondary',
    textColor: 'on_action_secondary',
    borderRadius: 'small',
    typo: 'caption',
    fontWeight: 500,
    // No token for text wrapping.
    style: { whiteSpace: 'nowrap' },
  },
  chipRemove: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '1.125rem',
    height: '1.125rem',
    borderRadius: 'small',
    cursor: 'pointer',
    opacity: 0.7,
    ':hover': { opacity: 1 },
    ':focus-visible': { shadow: 'focus' },
  },
  chipRemoveIcon: {
    width: '0.75rem',
    height: '0.75rem',
  },
  chipInput: {
    flexGrow: '1',
    flexBasis: 0,
    minWidth: '4rem',
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
      {...s.trigger.with({ className })}
      {...props}
    >
      {children}
      <ChevronDownIcon data-slot="combobox-trigger-icon" {...s.triggerIcon} />
    </ComboboxPrimitive.Trigger>
  )
}

function ComboboxClear({ className, ...props }: ComboboxPrimitive.Clear.Props) {
  return (
    <ComboboxPrimitive.Clear
      data-slot="combobox-clear"
      render={<InputGroupButton variant="ghost" size="icon-xs" />}
      className={className}
      aria-label="Clear"
      {...props}
    >
      <XIcon />
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
    // The group is the popup's anchor, so the list matches the field's width.
    <ComboboxPrimitive.InputGroup
      render={
        <InputGroup
          className={typeof className === 'string' ? className : undefined}
        />
      }
    >
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
            disabled={disabled}
          >
            <ComboboxTrigger aria-label="Show options" />
          </InputGroupButton>
        )}
        {showClear && <ComboboxClear disabled={disabled} />}
      </InputGroupAddon>
      {children}
    </ComboboxPrimitive.InputGroup>
  )
}

function ComboboxContent({
  className,
  side = 'bottom',
  sideOffset = 6,
  align = 'start',
  alignOffset = 0,
  anchor,
  ...props
}: ComboboxPrimitive.Popup.Props &
  Pick<
    ComboboxPrimitive.Positioner.Props,
    'side' | 'align' | 'sideOffset' | 'alignOffset' | 'anchor'
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
        {...s.positioner}
      >
        <ComboboxPrimitive.Popup
          data-slot="combobox-content"
          data-chips={!!anchor}
          {...s.content.with({ className })}
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
      {...s.item.with({ className })}
      {...props}
    >
      {children}
      <ComboboxPrimitive.ItemIndicator
        data-slot="combobox-item-indicator"
        render={<span {...s.itemIndicator} />}
      >
        <CheckIcon />
      </ComboboxPrimitive.ItemIndicator>
    </ComboboxPrimitive.Item>
  )
}

function ComboboxGroup({ className, ...props }: ComboboxPrimitive.Group.Props) {
  return (
    <ComboboxPrimitive.Group
      data-slot="combobox-group"
      className={className}
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
          data-slot="combobox-chip-remove"
          aria-label="Remove"
          {...s.chipRemove}
        >
          <XIcon {...s.chipRemoveIcon} />
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
