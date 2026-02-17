"use client"

import * as React from "react"
import { CheckIcon } from "lucide-react"
import { Checkbox as CheckboxPrimitive } from "radix-ui"
import { useStyles } from "@toned/react"
import { stylesheet } from "@toned/systems/base"

import { cn } from "@/lib/utils"

const checkboxStyles = stylesheet({
  root: {
    borderColor: 'input',
    borderWidth: 'thin',
    width: '1rem',
    height: '1rem',
    flexShrink: '0',
    borderRadius: 'small',
    shadow: 'small',
    style: {
      outline: 'none',
      transition: 'box-shadow 0.15s',
    },
  },
  indicator: {
    display: 'grid',
    placeContent: 'center',
    style: {
      color: 'currentColor',
      transition: 'none',
    },
  },
})

function Checkbox({
  className,
  ...props
}: React.ComponentProps<typeof CheckboxPrimitive.Root>) {
  const s = useStyles(checkboxStyles)

  return (
    <CheckboxPrimitive.Root
      data-slot="checkbox"
      className={cn(s.root.className, className)}
      style={s.root.style}
      {...props}
    >
      <CheckboxPrimitive.Indicator
        data-slot="checkbox-indicator"
        className={s.indicator.className}
        style={s.indicator.style}
      >
        <CheckIcon className="size-3.5" />
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  )
}

export { Checkbox }
