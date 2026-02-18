"use client"

import * as React from "react"
import { useStyles } from "@toned/react"
import { stylesheet } from "@toned/systems/base"

const tableStyles = stylesheet({
  container: {
    position: 'relative',
    width: '100%',
    overflow: 'auto',
  },
  table: {
    width: '100%',
    typo: 'body_small',
    style: { captionSide: 'bottom' },
  },
  footer: {
    borderColor: 'default',
    borderWidth: 'thin',
    fontWeight: 500,
    style: {
      backgroundColor: 'color-mix(in srgb, var(--muted) 50%, transparent)',
      borderTop: '1px solid var(--border)',
    },
  },
  row: {
    borderColor: 'default',
    style: {
      borderBottom: '1px solid var(--border)',
      transition: 'background-color 0.15s',
    },
  },
  head: {
    textColor: 'default',
    height: '2.5rem',
    paddingX: 2,
    fontWeight: 500,
    style: {
      textAlign: 'left',
      verticalAlign: 'middle',
      whiteSpace: 'nowrap' as const,
    },
  },
  cell: {
    padding: 2,
    style: {
      verticalAlign: 'middle',
      whiteSpace: 'nowrap' as const,
    },
  },
  caption: {
    textColor: 'muted',
    marginTop: 4,
    typo: 'body_small',
  },
})

function Table({ className, ...props }: React.ComponentProps<"table">) {
  const s = useStyles(tableStyles)

  return (
    <div
      data-slot="table-container"
      {...s.container}
    >
      <table
        data-slot="table"
        {...s.table.with({ className })}
        {...props}
      />
    </div>
  )
}

function TableHeader({ className, ...props }: React.ComponentProps<"thead">) {
  return (
    <thead
      data-slot="table-header"
      className={className}
      {...props}
    />
  )
}

function TableBody({ className, ...props }: React.ComponentProps<"tbody">) {
  return (
    <tbody
      data-slot="table-body"
      className={className}
      {...props}
    />
  )
}

function TableFooter({ className, ...props }: React.ComponentProps<"tfoot">) {
  const s = useStyles(tableStyles)

  return (
    <tfoot
      data-slot="table-footer"
      {...s.footer.with({ className })}
      {...props}
    />
  )
}

function TableRow({ className, ...props }: React.ComponentProps<"tr">) {
  const s = useStyles(tableStyles)

  return (
    <tr
      data-slot="table-row"
      {...s.row.with({ className })}
      {...props}
    />
  )
}

function TableHead({ className, ...props }: React.ComponentProps<"th">) {
  const s = useStyles(tableStyles)

  return (
    <th
      data-slot="table-head"
      {...s.head.with({ className })}
      {...props}
    />
  )
}

function TableCell({ className, ...props }: React.ComponentProps<"td">) {
  const s = useStyles(tableStyles)

  return (
    <td
      data-slot="table-cell"
      {...s.cell.with({ className })}
      {...props}
    />
  )
}

function TableCaption({
  className,
  ...props
}: React.ComponentProps<"caption">) {
  const s = useStyles(tableStyles)

  return (
    <caption
      data-slot="table-caption"
      {...s.caption.with({ className })}
      {...props}
    />
  )
}

export {
  Table,
  TableHeader,
  TableBody,
  TableFooter,
  TableHead,
  TableRow,
  TableCell,
  TableCaption,
}
