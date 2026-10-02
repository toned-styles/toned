'use client'

import type { Variants } from '@toned/core'
import { useStyles } from '@toned/react'
import { stylesheet } from '@toned/systems/base'
import { useMemo } from 'react'

import { Label } from '@/components/ui/label.tsx'
import { cn } from '@/lib/utils.ts'

export const fieldStyles = stylesheet({
  fieldSet: {
    flexLayout: 'column',
    gap: 5,
    minWidth: 0,
  },
  legend: {
    marginBottom: 3,
    textColor: 'default',
  },
  fieldGroup: {
    flexLayout: 'column',
    gap: 5,
    width: '100%',
  },
  field: {
    display: 'flex',
    width: '100%',
  },
  fieldContent: {
    flexLayout: 'column',
    gap: 1,
    flexGrow: '1',
    flexBasis: 0,
    minWidth: 0,
  },
  fieldLabel: {
    width: 'fit-content',
  },
  fieldTitle: {
    display: 'flex',
    alignItems: 'center',
    gap: 2,
    width: 'fit-content',
    typo: 'label_small',
  },
  fieldDescription: {
    textColor: 'muted',
    typo: 'body_small',
  },
  fieldSeparator: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
    gap: 3,
    typo: 'caption',
    textColor: 'muted',
  },
  fieldSeparatorLine: {
    flexGrow: '1',
    borderColor: 'default',
    // No token sets a single edge.
    $style: { borderTopWidth: 1 },
  },
  fieldError: {
    textColor: 'destructive',
    typo: 'body_small',
  },
  errorList: {
    flexLayout: 'column',
    gap: 1,
    paddingLeft: 4,
  },
}).variants(
  (
    $: Variants<{
      orientation: 'vertical' | 'horizontal' | 'responsive'
      legend: 'legend' | 'label'
    }>,
  ) => ({
    [$.orientation('vertical')]: {
      field: { flexLayout: 'column', gap: 2 },
    },
    [$.orientation('horizontal')]: {
      field: { flexLayout: 'row', alignItems: 'flex-start', gap: 3 },
    },
    // Stacked on small screens, side by side from the `md` breakpoint.
    [$.orientation('responsive')]: {
      field: {
        flexLayout: 'column',
        gap: 2,
        '@media md': { flexLayout: 'row', alignItems: 'flex-start', gap: 3 },
      },
    },
    [$.legend('legend')]: { legend: { typo: 'heading_4' } },
    [$.legend('label')]: { legend: { typo: 'label_small' } },
  }),
  { defaults: { orientation: 'vertical', legend: 'legend' } },
)

function FieldSet({ className, ...props }: React.ComponentProps<'fieldset'>) {
  const s = useStyles(fieldStyles)

  return (
    <fieldset
      data-slot="field-set"
      {...s.fieldSet.with({ className })}
      {...props}
    />
  )
}

function FieldLegend({
  className,
  variant = 'legend',
  ...props
}: React.ComponentProps<'legend'> & { variant?: 'legend' | 'label' }) {
  const s = useStyles(fieldStyles, { legend: variant })

  return (
    <legend
      data-slot="field-legend"
      data-variant={variant}
      {...s.legend.with({ className })}
      {...props}
    />
  )
}

function FieldGroup({ className, ...props }: React.ComponentProps<'div'>) {
  const s = useStyles(fieldStyles)

  return (
    <div
      data-slot="field-group"
      {...s.fieldGroup.with({ className })}
      {...props}
    />
  )
}

function Field({
  className,
  orientation = 'vertical',
  ...props
}: React.ComponentProps<'div'> & {
  orientation?: 'vertical' | 'horizontal' | 'responsive'
}) {
  const s = useStyles(fieldStyles, { orientation })

  return (
    <div
      role="group"
      data-slot="field"
      data-orientation={orientation}
      {...s.field.with({ className })}
      {...props}
    />
  )
}

function FieldContent({ className, ...props }: React.ComponentProps<'div'>) {
  const s = useStyles(fieldStyles)

  return (
    <div
      data-slot="field-content"
      {...s.fieldContent.with({ className })}
      {...props}
    />
  )
}

function FieldLabel({
  className,
  ...props
}: React.ComponentProps<typeof Label>) {
  const s = useStyles(fieldStyles)

  return (
    <Label
      data-slot="field-label"
      className={cn(s.fieldLabel.className, className)}
      {...props}
    />
  )
}

function FieldTitle({ className, ...props }: React.ComponentProps<'div'>) {
  const s = useStyles(fieldStyles)

  return (
    <div
      data-slot="field-title"
      {...s.fieldTitle.with({ className })}
      {...props}
    />
  )
}

function FieldDescription({ className, ...props }: React.ComponentProps<'p'>) {
  const s = useStyles(fieldStyles)

  return (
    <p
      data-slot="field-description"
      {...s.fieldDescription.with({ className })}
      {...props}
    />
  )
}

function FieldSeparator({
  children,
  className,
  ...props
}: React.ComponentProps<'div'> & {
  children?: React.ReactNode
}) {
  const s = useStyles(fieldStyles)

  return (
    <div
      data-slot="field-separator"
      data-content={!!children}
      {...s.fieldSeparator.with({ className })}
      {...props}
    >
      <span data-slot="field-separator-line" {...s.fieldSeparatorLine} />
      {children && (
        <>
          <span data-slot="field-separator-content">{children}</span>
          <span data-slot="field-separator-line" {...s.fieldSeparatorLine} />
        </>
      )}
    </div>
  )
}

function FieldError({
  className,
  children,
  errors,
  ...props
}: React.ComponentProps<'div'> & {
  errors?: Array<{ message?: string } | undefined>
}) {
  const s = useStyles(fieldStyles)

  const content = useMemo(() => {
    if (children) {
      return children
    }

    if (!errors?.length) {
      return null
    }

    const uniqueErrors = [
      ...new Map(errors.map((error) => [error?.message, error])).values(),
    ]

    if (uniqueErrors?.length === 1) {
      return uniqueErrors[0]?.message
    }

    return (
      <ul {...s.errorList}>
        {uniqueErrors.map(
          (error, index) =>
            error?.message && <li key={index}>{error.message}</li>,
        )}
      </ul>
    )
  }, [children, errors, s.errorList])

  if (!content) {
    return null
  }

  return (
    <div
      role="alert"
      data-slot="field-error"
      {...s.fieldError.with({ className })}
      {...props}
    >
      {content}
    </div>
  )
}

export {
  Field,
  FieldLabel,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLegend,
  FieldSeparator,
  FieldSet,
  FieldContent,
  FieldTitle,
}
