import { useStyles } from '@toned/react'
import { stylesheet } from '@toned/systems/base'
import { Label as LabelPrimitive } from 'radix-ui'
import type * as React from 'react'

const labelStyles = stylesheet({
  root: {
    display: 'flex',
    alignItems: 'center',
    gap: 2,
    typo: 'label_small',
    style: {
      cursor: 'default',
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
      {...s.root.with({ className })}
      {...props}
    />
  )
}

export { Label }
