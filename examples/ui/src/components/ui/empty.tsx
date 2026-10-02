import type { Variants } from '@toned/core'
import { useStyles } from '@toned/react'
import { stylesheet } from '@toned/systems/base'

export const emptyStyles = stylesheet({
  root: {
    flexLayout: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    width: '100%',
    minWidth: 0,
    padding: 6,
    borderColor: 'input',
    borderWidth: 'thin',
    borderRadius: 'large',
    // No tokens for a dashed edge or centred, balanced text.
    '@platform web': {
      $style: {
        borderStyle: 'dashed',
        textAlign: 'center',
        textWrap: 'balance',
      },
    },
    '@media md': { padding: 10 },
  },
  header: {
    flexLayout: 'column',
    alignItems: 'center',
    gap: 2,
    maxWidth: '24rem',
  },
  media: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: '0',
    marginBottom: 2,
  },
  title: {
    typo: 'heading_4',
  },
  description: {
    textColor: 'muted',
    typo: 'body_small',
  },
  content: {
    flexLayout: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    typo: 'body_small',
    maxWidth: '24rem',
    minWidth: 0,
  },
}).variants(
  ($: Variants<{ media: 'default' | 'icon' }>) => ({
    [$.media('icon')]: {
      media: {
        bgColor: 'action_secondary',
        textColor: 'on_action_secondary',
        width: '2.5rem',
        height: '2.5rem',
        borderRadius: 'large',
      },
    },
  }),
  { defaults: { media: 'default' } },
)

function Empty({ className, ...props }: React.ComponentProps<'div'>) {
  const s = useStyles(emptyStyles)

  return <div data-slot="empty" {...s.root.with({ className })} {...props} />
}

function EmptyHeader({ className, ...props }: React.ComponentProps<'div'>) {
  const s = useStyles(emptyStyles)

  return (
    <div
      data-slot="empty-header"
      {...s.header.with({ className })}
      {...props}
    />
  )
}

function EmptyMedia({
  className,
  variant = 'default',
  ...props
}: React.ComponentProps<'div'> & {
  variant?: 'default' | 'icon'
}) {
  const s = useStyles(emptyStyles, { media: variant })

  return (
    <div
      data-slot="empty-media"
      data-variant={variant}
      {...s.media.with({ className })}
      {...props}
    />
  )
}

function EmptyTitle({ className, ...props }: React.ComponentProps<'div'>) {
  const s = useStyles(emptyStyles)

  return (
    <div data-slot="empty-title" {...s.title.with({ className })} {...props} />
  )
}

function EmptyDescription({ className, ...props }: React.ComponentProps<'p'>) {
  const s = useStyles(emptyStyles)

  return (
    <p
      data-slot="empty-description"
      {...s.description.with({ className })}
      {...props}
    />
  )
}

function EmptyContent({ className, ...props }: React.ComponentProps<'div'>) {
  const s = useStyles(emptyStyles)

  return (
    <div
      data-slot="empty-content"
      {...s.content.with({ className })}
      {...props}
    />
  )
}

export {
  Empty,
  EmptyHeader,
  EmptyTitle,
  EmptyDescription,
  EmptyContent,
  EmptyMedia,
}
