import * as React from "react"
import { ChevronRight, MoreHorizontal } from "lucide-react"
import { Slot } from "radix-ui"
import { useStyles } from "@toned/react"
import { stylesheet } from "@toned/systems/base"

import { cn } from "@/lib/utils"

const breadcrumbStyles = stylesheet({
  list: {
    textColor: 'muted',
    display: 'flex',
    alignItems: 'center',
    gap: 1.5,
    typo: 'body_small',
    flexWrap: 'wrap',
    style: {
      wordBreak: 'break-word',
    },
    '@sm': {
      gap: 2.5,
    },
  },
  item: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 1.5,
  },
  link: {
    style: {
      transition: 'color 0.15s',
    },
    ':hover': {
      textColor: 'default',
    },
  },
  page: {
    textColor: 'default',
    fontWeight: 400,
  },
  ellipsis: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    style: {
      width: '2.25rem',
      height: '2.25rem',
    },
    ':hover': {
      textColor: 'default',
    },
  },
})

function Breadcrumb({ ...props }: React.ComponentProps<"nav">) {
  return <nav aria-label="breadcrumb" data-slot="breadcrumb" {...props} />
}

function BreadcrumbList({ className, ...props }: React.ComponentProps<"ol">) {
  const s = useStyles(breadcrumbStyles)

  return (
    <ol
      data-slot="breadcrumb-list"
      {...s.list.with({ className })}
      {...props}
    />
  )
}

function BreadcrumbItem({ className, ...props }: React.ComponentProps<"li">) {
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
}: React.ComponentProps<"a"> & {
  asChild?: boolean
}) {
  const Comp = asChild ? Slot.Root : "a"
  const s = useStyles(breadcrumbStyles)

  return (
    <Comp
      data-slot="breadcrumb-link"
      {...s.link.with({ className })}
      {...props}
    />
  )
}

function BreadcrumbPage({ className, ...props }: React.ComponentProps<"span">) {
  const s = useStyles(breadcrumbStyles)

  return (
    <span
      data-slot="breadcrumb-page"
      role="link"
      aria-disabled="true"
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
}: React.ComponentProps<"li">) {
  return (
    <li
      data-slot="breadcrumb-separator"
      role="presentation"
      aria-hidden="true"
      className={cn(className)}
      {...props}
    >
      {children ?? <ChevronRight style={{ width: '0.875rem', height: '0.875rem' }} />}
    </li>
  )
}

function BreadcrumbEllipsis({
  className,
  ...props
}: React.ComponentProps<"span">) {
  const s = useStyles(breadcrumbStyles)

  return (
    <span
      data-slot="breadcrumb-ellipsis"
      role="presentation"
      aria-hidden="true"
      {...s.ellipsis.with({ className })}
      {...props}
    >
      <MoreHorizontal className="size-4" />
      <span className="sr-only">More</span>
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
