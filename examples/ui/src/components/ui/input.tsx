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
})

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  const s = useStyles(inputStyles)

  return (
    <input
      type={type}
      data-slot="input"
      {...s.root.with({ className })}
      {...props}
    />
  )
}

export { Input }
