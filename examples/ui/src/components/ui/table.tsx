'use client'

import { useStyles } from '@toned/react'
import { stylesheet } from '@toned/systems/base'
import type * as React from 'react'

export const tableStyles = stylesheet({
  container: {
    position: 'relative',
    width: '100%',
    overflowX: 'auto',
  },
  table: {
    width: '100%',
    typo: 'body_small',
    textColor: 'default',
    // No tokens for table layout.
    '@platform web': {
      $style: { borderCollapse: 'collapse', captionSide: 'bottom' },
    },
  },
  header: {
    borderColor: 'default',
    // No token sets a single edge.
    $style: { borderBottomWidth: 1 },
  },
  footer: {
    bgColor: 'muted',
    borderColor: 'default',
    fontWeight: 500,
    // No token sets a single edge.
    $style: { borderTopWidth: 1 },
  },
  // The line between rows and the selected state are rules in styles.css.
  row: {
    borderColor: 'default',
    // No token: the transition list is specific to this part.
    '@platform web': { $style: { transition: 'background-color 0.15s' } },
    ':hover': { bgColor: 'muted' },
  },
  head: {
    height: '2.5rem',
    paddingX: 3,
    textColor: 'muted',
    typo: 'caption',
    fontWeight: 500,
    // No tokens for cell alignment or text wrapping.
    '@platform web': {
      $style: {
        textAlign: 'left',
        verticalAlign: 'middle',
        whiteSpace: 'nowrap',
      },
    },
  },
  cell: {
    paddingX: 3,
    paddingY: 2.5,
    // No tokens for cell alignment or text wrapping.
    '@platform web': {
      $style: {
        verticalAlign: 'middle',
        whiteSpace: 'nowrap',
      },
    },
  },
  caption: {
    paddingTop: 3,
    textColor: 'muted',
    typo: 'caption',
  },
})

function Table({ className, ...props }: React.ComponentProps<'table'>) {
  const s = useStyles(tableStyles)

  return (
    <div data-slot="table-container" {...s.container}>
      <table data-slot="table" {...s.table.with({ className })} {...props} />
    </div>
  )
}

function TableHeader({ className, ...props }: React.ComponentProps<'thead'>) {
  const s = useStyles(tableStyles)

  return (
    <thead
      data-slot="table-header"
      {...s.header.with({ className })}
      {...props}
    />
  )
}

function TableBody({ className, ...props }: React.ComponentProps<'tbody'>) {
  return <tbody data-slot="table-body" className={className} {...props} />
}

function TableFooter({ className, ...props }: React.ComponentProps<'tfoot'>) {
  const s = useStyles(tableStyles)

  return (
    <tfoot
      data-slot="table-footer"
      {...s.footer.with({ className })}
      {...props}
    />
  )
}

function TableRow({ className, ...props }: React.ComponentProps<'tr'>) {
  const s = useStyles(tableStyles)

  return <tr data-slot="table-row" {...s.row.with({ className })} {...props} />
}

function TableHead({ className, ...props }: React.ComponentProps<'th'>) {
  const s = useStyles(tableStyles)

  return (
    <th data-slot="table-head" {...s.head.with({ className })} {...props} />
  )
}

function TableCell({ className, ...props }: React.ComponentProps<'td'>) {
  const s = useStyles(tableStyles)

  return (
    <td data-slot="table-cell" {...s.cell.with({ className })} {...props} />
  )
}

function TableCaption({
  className,
  ...props
}: React.ComponentProps<'caption'>) {
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
