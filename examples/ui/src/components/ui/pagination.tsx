import * as React from "react"
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  MoreHorizontalIcon,
} from "lucide-react"
import { useStyles } from "@toned/react"
import { stylesheet } from "@toned/systems/base"

import { cn } from "@/lib/utils"
import { buttonStyles, type Button } from "@/components/ui/button"

const paginationStyles = stylesheet({
  root: {
    display: 'flex',
    justifyContent: 'center',
    style: {
      margin: '0 auto',
      width: '100%',
    },
  },
  content: {
    display: 'flex',
    alignItems: 'center',
    gap: 1,
    style: {
      flexDirection: 'row',
    },
  },
  ellipsis: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    style: {
      width: '2.25rem',
      height: '2.25rem',
    },
  },
  prevNextText: {
    style: {
      display: 'none',
    },
    '@sm': {
      style: {
        display: 'block',
      },
    },
  },
})

function Pagination({ className, ...props }: React.ComponentProps<"nav">) {
  const s = useStyles(paginationStyles)

  return (
    <nav
      role="navigation"
      aria-label="pagination"
      data-slot="pagination"
      className={cn(s.root.className, className)}
      style={s.root.style}
      {...props}
    />
  )
}

function PaginationContent({
  className,
  ...props
}: React.ComponentProps<"ul">) {
  const s = useStyles(paginationStyles)

  return (
    <ul
      data-slot="pagination-content"
      className={cn(s.content.className, className)}
      style={s.content.style}
      {...props}
    />
  )
}

function PaginationItem({ ...props }: React.ComponentProps<"li">) {
  return <li data-slot="pagination-item" {...props} />
}

type PaginationLinkProps = {
  isActive?: boolean
} & Pick<React.ComponentProps<typeof Button>, "size"> &
  React.ComponentProps<"a">

function PaginationLink({
  className,
  isActive,
  size = "icon",
  ...props
}: PaginationLinkProps) {
  const s = useStyles(buttonStyles, {
    variant: isActive ? "outline" : "ghost",
    size,
  })

  return (
    <a
      aria-current={isActive ? "page" : undefined}
      data-slot="pagination-link"
      data-active={isActive}
      className={cn(s.root.className, className)}
      style={s.root.style}
      {...props}
    />
  )
}

function PaginationPrevious({
  className,
  ...props
}: React.ComponentProps<typeof PaginationLink>) {
  const ps = useStyles(paginationStyles)

  return (
    <PaginationLink
      aria-label="Go to previous page"
      size="default"
      className={cn(className)}
      style={{ gap: '0.25rem', paddingLeft: '0.625rem', paddingRight: '0.625rem' }}
      {...props}
    >
      <ChevronLeftIcon />
      <span className={ps.prevNextText.className} style={ps.prevNextText.style}>Previous</span>
    </PaginationLink>
  )
}

function PaginationNext({
  className,
  ...props
}: React.ComponentProps<typeof PaginationLink>) {
  const ps = useStyles(paginationStyles)

  return (
    <PaginationLink
      aria-label="Go to next page"
      size="default"
      className={cn(className)}
      style={{ gap: '0.25rem', paddingLeft: '0.625rem', paddingRight: '0.625rem' }}
      {...props}
    >
      <span className={ps.prevNextText.className} style={ps.prevNextText.style}>Next</span>
      <ChevronRightIcon />
    </PaginationLink>
  )
}

function PaginationEllipsis({
  className,
  ...props
}: React.ComponentProps<"span">) {
  const s = useStyles(paginationStyles)

  return (
    <span
      aria-hidden
      data-slot="pagination-ellipsis"
      className={cn(s.ellipsis.className, className)}
      style={s.ellipsis.style}
      {...props}
    >
      <MoreHorizontalIcon style={{ width: '1rem', height: '1rem' }} />
      <span className="sr-only">More pages</span>
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
