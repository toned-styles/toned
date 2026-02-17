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
    style: {
      marginBottom: '0.75rem',
    },
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
    style: {
      width: '100%',
    },
  },
  field: {
    display: 'flex',
    gap: 3,
    style: {
      width: '100%',
    },
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
    style: {
      lineHeight: '1.5',
      fontWeight: 400,
    },
  },
  fieldSeparator: {
    position: 'relative',
    typo: 'body_small',
    style: {
      marginTop: '-0.5rem',
      marginBottom: '-0.5rem',
      height: '1.25rem',
    },
  },
  fieldSeparatorContent: {
    bgColor: 'default',
    textColor: 'muted',
    position: 'relative',
    style: {
      display: 'block',
      width: 'fit-content',
      margin: '0 auto',
      paddingLeft: '0.5rem',
      paddingRight: '0.5rem',
    },
  },
  fieldError: {
    textColor: 'destructive',
    typo: 'body_small',
    style: {
      fontWeight: 400,
    },
  },
  errorList: {
    display: 'flex',
    flexLayout: 'column',
    gap: 1,
    style: {
      marginLeft: '1rem',
      listStyleType: 'disc',
    },
  },
})

function FieldSet({ className, ...props }: React.ComponentProps<"fieldset">) {
  const s = useStyles(fieldStyles)

  return (
    <fieldset
      data-slot="field-set"
      className={cn(s.fieldSet.className, className)}
      style={s.fieldSet.style}
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
      className={cn("group/field-group", s.fieldGroup.className, className)}
      style={s.fieldGroup.style}
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
      className={cn("group/field-content", s.fieldContent.className, className)}
      style={s.fieldContent.style}
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
      className={cn("group/field-label", s.fieldLabel.className, className)}
      style={s.fieldLabel.style}
      {...props}
    />
  )
}

function FieldTitle({ className, ...props }: React.ComponentProps<"div">) {
  const s = useStyles(fieldStyles)

  return (
    <div
      data-slot="field-label"
      className={cn(s.fieldTitle.className, className)}
      style={s.fieldTitle.style}
      {...props}
    />
  )
}

function FieldDescription({ className, ...props }: React.ComponentProps<"p">) {
  const s = useStyles(fieldStyles)

  return (
    <p
      data-slot="field-description"
      className={cn(s.fieldDescription.className, className)}
      style={s.fieldDescription.style}
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
      className={cn(s.fieldSeparator.className, className)}
      style={s.fieldSeparator.style}
      {...props}
    >
      <Separator style={{ position: 'absolute', inset: 0, top: '50%' }} />
      {children && (
        <span
          className={s.fieldSeparatorContent.className}
          style={s.fieldSeparatorContent.style}
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
      <ul className={s.errorList.className} style={s.errorList.style}>
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
      className={cn(s.fieldError.className, className)}
      style={s.fieldError.style}
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
