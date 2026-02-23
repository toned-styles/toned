"use client"

import { useMemo } from "react"
import { useStyles } from "@toned/react"
import { stylesheet } from "@toned/systems/base"

import { cn } from "@/lib/utils"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"

const fieldStyles = stylesheet({
  fieldSet: {
    display: 'flex',
    flexLayout: 'column',
    gap: 6,
  },
  legend: {
    fontWeight: 500,
    marginBottom: 3,
  },
  legendVariantLegend: {
    style: {
      fontSize: '1rem',
      lineHeight: '1.5',
    },
  },
  legendVariantLabel: {
    typo: 'body_small',
  },
  fieldGroup: {
    display: 'flex',
    flexLayout: 'column',
    gap: 7,
    width: '100%',
  },
  field: {
    display: 'flex',
    gap: 3,
    width: '100%',
  },
  fieldVertical: {
    flexLayout: 'column',
  },
  fieldHorizontal: {
    alignItems: 'center',
    style: {
      flexDirection: 'row',
    },
  },
  fieldContent: {
    display: 'flex',
    flexLayout: 'column',
    gap: 1.5,
    style: {
      flex: 1,
      lineHeight: '1.4',
    },
  },
  fieldLabel: {
    display: 'flex',
    gap: 2,
    style: {
      width: 'fit-content',
      lineHeight: '1.4',
    },
  },
  fieldTitle: {
    display: 'flex',
    alignItems: 'center',
    gap: 2,
    typo: 'body_small',
    fontWeight: 500,
    style: {
      width: 'fit-content',
      lineHeight: '1.4',
    },
  },
  fieldDescription: {
    textColor: 'muted',
    typo: 'body_small',
    fontWeight: 400,
    style: {
      lineHeight: '1.5',
    },
  },
  fieldSeparator: {
    position: 'relative',
    typo: 'body_small',
    marginTop: -2,
    marginBottom: -2,
    height: '1.25rem',
  },
  fieldSeparatorContent: {
    bgColor: 'default',
    textColor: 'muted',
    position: 'relative',
    paddingLeft: 2,
    paddingRight: 2,
    style: {
      display: 'block',
      width: 'fit-content',
      margin: '0 auto',
    },
  },
  fieldError: {
    textColor: 'destructive',
    typo: 'body_small',
    fontWeight: 400,
  },
  errorList: {
    display: 'flex',
    flexLayout: 'column',
    gap: 1,
    marginLeft: 4,
    style: {
      listStyleType: 'disc',
    },
  },
})

function FieldSet({ className, ...props }: React.ComponentProps<"fieldset">) {
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
  variant = "legend",
  ...props
}: React.ComponentProps<"legend"> & { variant?: "legend" | "label" }) {
  const s = useStyles(fieldStyles)

  const variantStyle = variant === 'label' ? s.legendVariantLabel : s.legendVariantLegend

  return (
    <legend
      data-slot="field-legend"
      data-variant={variant}
      className={cn(s.legend.className, variantStyle.className, className)}
      style={{ ...s.legend.style, ...variantStyle.style }}
      {...props}
    />
  )
}

function FieldGroup({ className, ...props }: React.ComponentProps<"div">) {
  const s = useStyles(fieldStyles)

  return (
    <div
      data-slot="field-group"
      {...s.fieldGroup.with({ className: cn("group/field-group", className) })}
      {...props}
    />
  )
}

function Field({
  className,
  orientation = "vertical",
  ...props
}: React.ComponentProps<"div"> & {
  orientation?: "vertical" | "horizontal" | "responsive"
}) {
  const s = useStyles(fieldStyles)

  const orientationStyle = orientation === 'horizontal' ? s.fieldHorizontal : s.fieldVertical

  return (
    <div
      role="group"
      data-slot="field"
      data-orientation={orientation}
      className={cn("group/field", s.field.className, orientationStyle.className, className)}
      style={{ ...s.field.style, ...orientationStyle.style }}
      {...props}
    />
  )
}

function FieldContent({ className, ...props }: React.ComponentProps<"div">) {
  const s = useStyles(fieldStyles)

  return (
    <div
      data-slot="field-content"
      {...s.fieldContent.with({ className: cn("group/field-content", className) })}
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
      {...s.fieldLabel.with({ className: cn("group/field-label", className) })}
      {...props}
    />
  )
}

function FieldTitle({ className, ...props }: React.ComponentProps<"div">) {
  const s = useStyles(fieldStyles)

  return (
    <div
      data-slot="field-label"
      {...s.fieldTitle.with({ className })}
      {...props}
    />
  )
}

function FieldDescription({ className, ...props }: React.ComponentProps<"p">) {
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
}: React.ComponentProps<"div"> & {
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
      <Separator style={{ position: 'absolute', inset: 0, top: '50%' }} />
      {children && (
        <span
          {...s.fieldSeparatorContent}
          data-slot="field-separator-content"
        >
          {children}
        </span>
      )}
    </div>
  )
}

function FieldError({
  className,
  children,
  errors,
  ...props
}: React.ComponentProps<"div"> & {
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

    if (uniqueErrors?.length == 1) {
      return uniqueErrors[0]?.message
    }

    return (
      <ul {...s.errorList}>
        {uniqueErrors.map(
          (error, index) =>
            error?.message && <li key={index}>{error.message}</li>
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
