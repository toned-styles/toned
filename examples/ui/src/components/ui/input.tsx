import * as React from "react"
import { useStyles } from "@toned/react"
import { stylesheet } from "@toned/systems/base"

const inputStyles = stylesheet({
  root: {
    borderColor: 'input',
    borderWidth: 'thin',
    borderRadius: 'medium',
    height: '2.25rem',
    width: '100%',
    minWidth: '0',
    paddingX: 3,
    paddingY: 1,
    typo: 'body_medium',
    shadow: 'small',
    style: {
      backgroundColor: 'transparent',
      outline: 'none',
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

function Input({ className, type, disabled, ...props }: React.ComponentProps<"input">) {
  const s = useStyles(inputStyles)

  return (
    <input
      type={type}
      data-slot="input"
      {...s.root.with(disabled && s.disabled).with(props['aria-invalid'] === 'true' && s.invalid).with({ className })}
      disabled={disabled}
      {...props}
    />
  )
}

export { Input }
