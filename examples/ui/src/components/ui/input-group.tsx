import type { Variants } from '@toned/core'
import { useStyles } from '@toned/react'
import { stylesheet } from '@toned/systems/base'
import type * as React from 'react'
import { Button } from '@/components/ui/button.tsx'

/*
 * A block addon turns the group into a column. That depends on the group's
 * children (`:has`), so it is a structural rule in styles.css.
 */
export const inputGroupStyles = stylesheet({
  root: {
    display: 'flex',
    alignItems: 'center',
    flexWrap: 'wrap',
    position: 'relative',
    width: '100%',
    minWidth: 0,
    minHeight: '2.25rem',
    bgColor: 'default',
    textColor: 'default',
    borderColor: 'input',
    borderWidth: 'thin',
    borderRadius: 'medium',
    shadow: 'small',
    // No token: the transition list is specific to this control.
    style: { transition: 'border-color 0.15s, box-shadow 0.15s' },
    ':focus-within': { borderColor: 'action', shadow: 'focus' },
  },
  // The control has no border of its own: the group draws it.
  control: {
    flexGrow: '1',
    flexBasis: 0,
    minWidth: 0,
    paddingX: 3,
    paddingY: 1.5,
    typo: 'body_small',
  },
  addon: {
    textColor: 'muted',
    display: 'flex',
    alignItems: 'center',
    gap: 2,
    typo: 'label_small',
    cursor: 'text',
    // No token: addon text is not selectable.
    style: { userSelect: 'none' },
  },
  text: {
    textColor: 'muted',
    display: 'flex',
    alignItems: 'center',
    gap: 2,
    typo: 'body_small',
  },
}).variants(
  (
    $: Variants<{
      align: 'inline-start' | 'inline-end' | 'block-start' | 'block-end'
      multiline: boolean
    }>,
  ) => ({
    // No token for flex order: an addon sits before or after the control
    // whatever its position in the markup.
    [$.align('inline-start')]: {
      addon: { paddingLeft: 3, style: { order: -1 } },
    },
    [$.align('inline-end')]: {
      addon: { paddingRight: 2, style: { order: 1 } },
    },
    [$.align('block-start')]: {
      addon: {
        width: '100%',
        paddingX: 3,
        paddingTop: 2.5,
        style: { order: -1 },
      },
    },
    [$.align('block-end')]: {
      addon: {
        width: '100%',
        paddingX: 2,
        paddingBottom: 2,
        style: { order: 1 },
      },
    },
    [$.multiline(true)]: {
      control: {
        minHeight: '4rem',
        paddingY: 2.5,
        // No tokens: the field grows with its content and is not resized by hand.
        style: { fieldSizing: 'content', resize: 'none' },
      },
    },
  }),
  { defaults: { align: 'inline-start', multiline: false } },
)

function InputGroup({ className, ...props }: React.ComponentProps<'div'>) {
  const s = useStyles(inputGroupStyles)

  return (
    <div
      data-slot="input-group"
      role="group"
      {...s.root.with({ className })}
      {...props}
    />
  )
}

function InputGroupAddon({
  className,
  align = 'inline-start',
  ...props
}: React.ComponentProps<'div'> & {
  align?: 'inline-start' | 'inline-end' | 'block-start' | 'block-end'
}) {
  const s = useStyles(inputGroupStyles, { align })

  return (
    <div
      role="group"
      data-slot="input-group-addon"
      data-align={align}
      {...s.addon.with({
        className,
        onPointerDown: (event: React.PointerEvent<HTMLDivElement>) => {
          // This enlarges the pointer focus target. Keyboard users tab directly
          // to the control; the decorative group is not an additional control.
          if ((event.target as HTMLElement).closest('button')) return
          event.preventDefault()
          event.currentTarget.parentElement
            ?.querySelector<HTMLElement>('[data-slot="input-group-control"]')
            ?.focus()
        },
      })}
      {...props}
    />
  )
}

function InputGroupButton({
  type = 'button',
  variant = 'ghost',
  size = 'xs',
  ...props
}: React.ComponentProps<typeof Button>) {
  return <Button type={type} variant={variant} size={size} {...props} />
}

function InputGroupText({ className, ...props }: React.ComponentProps<'span'>) {
  const s = useStyles(inputGroupStyles)

  return (
    <span
      data-slot="input-group-text"
      {...s.text.with({ className })}
      {...props}
    />
  )
}

function InputGroupInput({
  className,
  ...props
}: React.ComponentProps<'input'>) {
  const s = useStyles(inputGroupStyles)

  return (
    <input
      data-slot="input-group-control"
      {...s.control.with({ className })}
      {...props}
    />
  )
}

function InputGroupTextarea({
  className,
  ...props
}: React.ComponentProps<'textarea'>) {
  const s = useStyles(inputGroupStyles, { multiline: true })

  return (
    <textarea
      data-slot="input-group-control"
      {...s.control.with({ className })}
      {...props}
    />
  )
}

export {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupText,
  InputGroupInput,
  InputGroupTextarea,
}
