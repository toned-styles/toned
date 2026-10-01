import type { Variants } from '@toned/core'
import { useStyles } from '@toned/react'
import { stylesheet } from '@toned/systems/base'
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  MoreHorizontalIcon,
} from 'lucide-react'
import type * as React from 'react'

export const paginationStyles = stylesheet({
  root: {
    display: 'flex',
    justifyContent: 'center',
    width: '100%',
  },
  content: {
    display: 'flex',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 1,
  },
  link: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 1,
    minWidth: '2.25rem',
    height: '2.25rem',
    paddingX: 2.5,
    borderRadius: 'medium',
    typo: 'label_small',
    textColor: 'default',
    cursor: 'pointer',
    // No token: the transition list is specific to this part.
    style: { transition: 'background-color 0.15s, box-shadow 0.15s' },
    ':hover': { bgColor: 'subtle' },
    ':focus-visible': { shadow: 'focus' },
  },
  ellipsis: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '2.25rem',
    height: '2.25rem',
    textColor: 'muted',
  },
  // On narrow screens the previous and next links show their icon only.
  prevNextText: {
    display: 'none',
    '@sm': { display: 'block' },
  },
}).variants(
  ($: Variants<{ active: boolean }>) => ({
    [$.active(true)]: {
      link: {
        bgColor: 'default',
        borderColor: 'input',
        borderWidth: 'thin',
        shadow: 'small',
      },
    },
  }),
  { defaults: { active: false } },
)

function Pagination({ className, ...props }: React.ComponentProps<'nav'>) {
  const s = useStyles(paginationStyles)

  return (
    <nav
      aria-label="Pagination"
      data-slot="pagination"
      {...s.root.with({ className })}
      {...props}
    />
  )
}

function PaginationContent({
  className,
  ...props
}: React.ComponentProps<'ul'>) {
  const s = useStyles(paginationStyles)

  return (
    <ul
      data-slot="pagination-content"
      {...s.content.with({ className })}
      {...props}
    />
  )
}

function PaginationItem({ ...props }: React.ComponentProps<'li'>) {
  return <li data-slot="pagination-item" {...props} />
}

type PaginationLinkProps = {
  isActive?: boolean
} & React.ComponentProps<'a'>

function PaginationLink({
  className,
  isActive = false,
  ...props
}: PaginationLinkProps) {
  const s = useStyles(paginationStyles, { active: isActive })

  return (
    <a
      aria-current={isActive ? 'page' : undefined}
      data-slot="pagination-link"
      data-active={isActive}
      {...s.link.with({ className })}
      {...props}
    />
  )
}

function PaginationPrevious(props: PaginationLinkProps) {
  const s = useStyles(paginationStyles)

  return (
    <PaginationLink aria-label="Go to previous page" {...props}>
      <ChevronLeftIcon />
      <span {...s.prevNextText}>Previous</span>
    </PaginationLink>
  )
}

function PaginationNext(props: PaginationLinkProps) {
  const s = useStyles(paginationStyles)

  return (
    <PaginationLink aria-label="Go to next page" {...props}>
      <span {...s.prevNextText}>Next</span>
      <ChevronRightIcon />
    </PaginationLink>
  )
}

function PaginationEllipsis({
  className,
  ...props
}: React.ComponentProps<'span'>) {
  const s = useStyles(paginationStyles)

  return (
    <span
      role="img"
      aria-label="More pages"
      data-slot="pagination-ellipsis"
      {...s.ellipsis.with({ className })}
      {...props}
    >
      <MoreHorizontalIcon />
    </span>
  )
}

export {
  Pagination,
  PaginationContent,
  PaginationLink,
  PaginationItem,
  PaginationPrevious,
  PaginationNext,
  PaginationEllipsis,
}
