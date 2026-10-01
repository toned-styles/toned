import type { Variants } from '@toned/core'
import { useStyles } from '@toned/react'
import { stylesheet } from '@toned/systems/base'
import { Slot } from 'radix-ui'

import { Separator } from '@/components/ui/separator.tsx'

/*
 * Joined corners and shared borders between neighbours are structural rules
 * in styles.css: they depend on a child's position in the group.
 */
export const buttonGroupStyles = stylesheet({
  root: {
    display: 'flex',
    alignItems: 'stretch',
    width: 'fit-content',
  },
  text: {
    bgColor: 'muted',
    textColor: 'muted',
    display: 'flex',
    alignItems: 'center',
    gap: 2,
    borderColor: 'input',
    borderWidth: 'thin',
    borderRadius: 'medium',
    typo: 'label_small',
    shadow: 'small',
    paddingX: 3,
  },
}).variants(
  ($: Variants<{ orientation: 'horizontal' | 'vertical' }>) => ({
    [$.orientation('vertical')]: {
      root: { flexLayout: 'column' },
    },
  }),
  { defaults: { orientation: 'horizontal' } },
)

function ButtonGroup({
  className,
  orientation = 'horizontal',
  ...props
}: React.ComponentProps<'div'> & {
  orientation?: 'horizontal' | 'vertical'
}) {
  const s = useStyles(buttonGroupStyles, { orientation })

  return (
    <div
      role="group"
      data-slot="button-group"
      data-orientation={orientation}
      {...s.root.with({ className })}
      {...props}
    />
  )
}

function ButtonGroupText({
  className,
  asChild = false,
  ...props
}: React.ComponentProps<'div'> & {
  asChild?: boolean
}) {
  const Comp = asChild ? Slot.Root : 'div'
  const s = useStyles(buttonGroupStyles)

  return (
    <Comp
      data-slot="button-group-text"
      {...s.text.with({ className })}
      {...props}
    />
  )
}

function ButtonGroupSeparator({
  orientation = 'vertical',
  ...props
}: React.ComponentProps<typeof Separator>) {
  return (
    <Separator
      data-slot="button-group-separator"
      orientation={orientation}
      {...props}
    />
  )
}

export { ButtonGroup, ButtonGroupSeparator, ButtonGroupText }
