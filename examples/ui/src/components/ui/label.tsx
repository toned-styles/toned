import * as React from "react"
import { Label as LabelPrimitive } from "radix-ui"
import { useStyles } from "@toned/react"
import { stylesheet } from "@toned/systems/base"

import { cn } from "@/lib/utils"

const labelStyles = stylesheet({
  root: {
    display: 'flex',
    alignItems: 'center',
    gap: 2,
    typo: 'label_small',
    style: {
      userSelect: 'none',
    },
  },
})

function Label({
  className,
  ...props
}: React.ComponentProps<typeof LabelPrimitive.Root>) {
  const s = useStyles(labelStyles)

  return (
    <LabelPrimitive.Root
      data-slot="label"
      className={cn(s.root.className, className)}
      style={s.root.style}
      {...props}
    />
  )
}

export { Label }
