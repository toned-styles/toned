import type { Variants } from '@toned/core'
import { useStyles } from '@toned/react'
import { stylesheet } from '@toned/systems/base'
import { Slot } from 'radix-ui'
import type * as React from 'react'
import { Separator } from '@/components/ui/separator.tsx'

export const itemStyles = stylesheet({
  group: {
    flexLayout: 'column',
  },
  root: {
    display: 'flex',
    alignItems: 'center',
    flexWrap: 'wrap',
    width: '100%',
    borderRadius: 'large',
    typo: 'body_small',
    textColor: 'default',
    // No token: the transition list is specific to this part.
    style: { transition: 'background-color 0.15s, box-shadow 0.15s' },
    ':focus-visible': { shadow: 'focus' },
  },
  media: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    flexShrink: '0',
  },
  content: {
    flexLayout: 'column',
    gap: 0.5,
    flexGrow: '1',
    flexBasis: 0,
    minWidth: 0,
  },
  title: {
    display: 'flex',
    alignItems: 'center',
    gap: 2,
    width: 'fit-content',
    typo: 'label_small',
  },
  description: {
    textColor: 'muted',
    typo: 'body_small',
  },
  actions: {
    display: 'flex',
    alignItems: 'center',
    gap: 2,
  },
  headerFooter: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 2,
    width: '100%',
  },
}).variants(
  (
    $: Variants<{
      variant: 'default' | 'outline' | 'muted'
      size: 'default' | 'sm'
      media: 'default' | 'icon' | 'image'
    }>,
  ) => ({
    [$.variant('outline')]: {
      root: {
        bgColor: 'elevated',
        borderColor: 'default',
        borderWidth: 'thin',
      },
    },
    [$.variant('muted')]: {
      root: { bgColor: 'muted' },
    },
    [$.size('default')]: {
      root: { padding: 4, gap: 4 },
    },
    [$.size('sm')]: {
      root: { paddingX: 3, paddingY: 2.5, gap: 3 },
    },
    [$.media('icon')]: {
      media: {
        bgColor: 'action_secondary',
        textColor: 'on_action_secondary',
        width: '2rem',
        height: '2rem',
        borderRadius: 'medium',
      },
    },
    [$.media('image')]: {
      media: {
        width: '2.5rem',
        height: '2.5rem',
        borderRadius: 'medium',
        overflow: 'hidden',
      },
    },
  }),
  { defaults: { variant: 'default', size: 'default', media: 'default' } },
)

function ItemGroup({ className, ...props }: React.ComponentProps<'div'>) {
  const s = useStyles(itemStyles)

  return (
    <div
      role="list"
      data-slot="item-group"
      {...s.group.with({ className })}
      {...props}
    />
  )
}

function ItemSeparator(props: React.ComponentProps<typeof Separator>) {
  return (
    <Separator data-slot="item-separator" orientation="horizontal" {...props} />
  )
}

function Item({
  className,
  variant = 'default',
  size = 'default',
  asChild = false,
  ...props
}: React.ComponentProps<'div'> & {
  variant?: 'default' | 'outline' | 'muted'
  size?: 'default' | 'sm'
  asChild?: boolean
}) {
  const Comp = asChild ? Slot.Root : 'div'
  const s = useStyles(itemStyles, { variant, size })

  return (
    <Comp
      data-slot="item"
      data-variant={variant}
      data-size={size}
      {...s.root.with({ className })}
      {...props}
    />
  )
}

function ItemMedia({
  className,
  variant = 'default',
  ...props
}: React.ComponentProps<'div'> & {
  variant?: 'default' | 'icon' | 'image'
}) {
  const s = useStyles(itemStyles, { media: variant })

  return (
    <div
      data-slot="item-media"
      data-variant={variant}
      {...s.media.with({ className })}
      {...props}
    />
  )
}

function ItemContent({ className, ...props }: React.ComponentProps<'div'>) {
  const s = useStyles(itemStyles)

  return (
    <div
      data-slot="item-content"
      {...s.content.with({ className })}
      {...props}
    />
  )
}

function ItemTitle({ className, ...props }: React.ComponentProps<'div'>) {
  const s = useStyles(itemStyles)

  return (
    <div data-slot="item-title" {...s.title.with({ className })} {...props} />
  )
}

function ItemDescription({ className, ...props }: React.ComponentProps<'p'>) {
  const s = useStyles(itemStyles)

  return (
    <p
      data-slot="item-description"
      {...s.description.with({ className })}
      {...props}
    />
  )
}

function ItemActions({ className, ...props }: React.ComponentProps<'div'>) {
  const s = useStyles(itemStyles)

  return (
    <div
      data-slot="item-actions"
      {...s.actions.with({ className })}
      {...props}
    />
  )
}

function ItemHeader({ className, ...props }: React.ComponentProps<'div'>) {
  const s = useStyles(itemStyles)

  return (
    <div
      data-slot="item-header"
      {...s.headerFooter.with({ className })}
      {...props}
    />
  )
}

function ItemFooter({ className, ...props }: React.ComponentProps<'div'>) {
  const s = useStyles(itemStyles)

  return (
    <div
      data-slot="item-footer"
      {...s.headerFooter.with({ className })}
      {...props}
    />
  )
}

export {
  Item,
  ItemMedia,
  ItemContent,
  ItemActions,
  ItemGroup,
  ItemSeparator,
  ItemTitle,
  ItemDescription,
  ItemHeader,
  ItemFooter,
}
