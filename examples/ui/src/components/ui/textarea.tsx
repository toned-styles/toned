import * as React from "react"
import { useStyles } from "@toned/react"
import { stylesheet } from "@toned/systems/base"

const textareaStyles = stylesheet({
  root: {
    borderColor: 'input',
    borderWidth: 'thin',
    borderRadius: 'medium',
    width: '100%',
    minHeight: '4rem',
    paddingX: 3,
    paddingY: 2,
    typo: 'body_medium',
    shadow: 'small',
    display: 'flex',
    style: {
      backgroundColor: 'transparent',
      outline: 'none',
      fieldSizing: 'content',
      transition: 'color 0.15s, box-shadow 0.15s',
    },
    '@md': {
      typo: 'body_small',
    },
  },
  disabled: {
    cursor: 'not-allowed',
    opacity: 0.5,
  },
  invalid: {
    borderColor: 'destructive',
    style: { boxShadow: '0 0 0 2px color-mix(in srgb, var(--destructive) 20%, transparent)' },
  },
})

function Textarea({ className, disabled, ...props }: React.ComponentProps<"textarea">) {
  const s = useStyles(textareaStyles)

  return (
    <textarea
      data-slot="textarea"
      {...s.root.with(disabled && s.disabled).with(props['aria-invalid'] === 'true' && s.invalid).with({ className })}
      disabled={disabled}
      {...props}
    />
  )
}

export { Textarea }
