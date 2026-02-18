import * as React from "react"
import { Separator as SeparatorPrimitive } from "radix-ui"
import { useStyles } from "@toned/react"
import { stylesheet } from "@toned/systems/base"

const separatorStyles = stylesheet({
  root: {
    bgColor: 'subtle',
    flexShrink: '0',
  },
})

function Separator({
  className,
  orientation = "horizontal",
  decorative = true,
  ...props
}: React.ComponentProps<typeof SeparatorPrimitive.Root>) {
  const s = useStyles(separatorStyles)

  return (
    <SeparatorPrimitive.Root
      data-slot="separator"
      decorative={decorative}
      orientation={orientation}
      {...s.root.with({ className })}
      {...props}
    />
  )
}

export { Separator }
