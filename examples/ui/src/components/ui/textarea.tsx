import * as React from "react"
import { useStyles } from "@toned/react"
import { stylesheet } from "@toned/systems/base"

import { cn } from "@/lib/utils"

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
})

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  const s = useStyles(textareaStyles)

  return (
    <textarea
      data-slot="textarea"
      className={cn(s.root.className, className)}
      style={s.root.style}
      {...props}
    />
  )
}

export { Textarea }
