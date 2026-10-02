import { useStyles } from '@toned/react'
import { stylesheet } from '@toned/systems/base'
import { ChevronRight, MoreHorizontal } from 'lucide-react'
import { Slot } from 'radix-ui'
import type * as React from 'react'

export const breadcrumbStyles = stylesheet({
  list: {
    textColor: 'muted',
    display: 'flex',
    alignItems: 'center',
    gap: 1.5,
    typo: 'body_small',
    flexWrap: 'wrap',
    '@media sm': { gap: 2 },
  },
  item: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 1.5,
  },
  link: {
    borderRadius: 'small',
    // No token: the transition list is specific to this part.
    '@platform web': {
      $style: { transition: 'color 0.15s, box-shadow 0.15s' },
    },
    ':hover': { textColor: 'default' },
    ':focus-visible': { shadow: 'focus' },
  },
  page: {
    textColor: 'default',
    fontWeight: 500,
  },
  separator: {
    display: 'inline-flex',
    alignItems: 'center',
  },
  separatorIcon: {
    width: '0.875rem',
    height: '0.875rem',
  },
  ellipsis: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '1.5rem',
    height: '1.5rem',
  },
})

function Breadcrumb({ ...props }: React.ComponentProps<'nav'>) {
  return <nav aria-label="breadcrumb" data-slot="breadcrumb" {...props} />
}

function BreadcrumbList({ className, ...props }: React.ComponentProps<'ol'>) {
  const s = useStyles(breadcrumbStyles)

  return (
    <ol
      data-slot="breadcrumb-list"
      {...s.list.with({ className })}
      {...props}
    />
  )
}

function BreadcrumbItem({ className, ...props }: React.ComponentProps<'li'>) {
  const s = useStyles(breadcrumbStyles)

  return (
    <li
      data-slot="breadcrumb-item"
      {...s.item.with({ className })}
      {...props}
    />
  )
}

function BreadcrumbLink({
  asChild,
  className,
  ...props
}: React.ComponentProps<'a'> & {
  asChild?: boolean
}) {
  const Comp = asChild ? Slot.Root : 'a'
  const s = useStyles(breadcrumbStyles)

  return (
    <Comp
      data-slot="breadcrumb-link"
      {...s.link.with({ className })}
      {...props}
    />
  )
}

function BreadcrumbPage({ className, ...props }: React.ComponentProps<'span'>) {
  const s = useStyles(breadcrumbStyles)

  return (
    <span
      data-slot="breadcrumb-page"
      aria-current="page"
      {...s.page.with({ className })}
      {...props}
    />
  )
}

function BreadcrumbSeparator({
  children,
  className,
  ...props
}: React.ComponentProps<'li'>) {
  const s = useStyles(breadcrumbStyles)

  return (
    <li
      data-slot="breadcrumb-separator"
      role="presentation"
      aria-hidden="true"
      {...s.separator.with({ className })}
      {...props}
    >
      {children ?? <ChevronRight {...s.separatorIcon} />}
    </li>
  )
}

function BreadcrumbEllipsis({
  className,
  ...props
}: React.ComponentProps<'span'>) {
  const s = useStyles(breadcrumbStyles)

  return (
    <span
      data-slot="breadcrumb-ellipsis"
      role="img"
      aria-label="More"
      {...s.ellipsis.with({ className })}
      {...props}
    >
      <MoreHorizontal />
    </span>
  )
}

export {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbPage,
  BreadcrumbSeparator,
  BreadcrumbEllipsis,
}
