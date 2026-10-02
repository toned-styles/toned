import type { Variants } from '@toned/core'
import { useStyles } from '@toned/react'
import { stylesheet } from '@toned/systems/base'
import { Separator as SeparatorPrimitive } from 'radix-ui'
import type * as React from 'react'

export const separatorStyles = stylesheet({
  root: {
    flexShrink: '0',
    borderColor: 'default',
  },
}).variants(
  ($: Variants<{ orientation: 'horizontal' | 'vertical' }>) => ({
    // No token sets a single edge, so the one-pixel line is written directly.
    [$.orientation('horizontal')]: {
      root: { width: '100%', $style: { borderTopWidth: 1 } },
    },
    [$.orientation('vertical')]: {
      root: { alignSelf: 'stretch', $style: { borderLeftWidth: 1 } },
    },
  }),
  { defaults: { orientation: 'horizontal' } },
)

function Separator({
  className,
  style,
  orientation = 'horizontal',
  decorative = true,
  ...props
}: React.ComponentProps<typeof SeparatorPrimitive.Root>) {
  const s = useStyles(separatorStyles, { orientation })

  return (
    <SeparatorPrimitive.Root
      data-slot="separator"
      decorative={decorative}
      orientation={orientation}
      {...s.root.with({ className, style })}
      {...props}
    />
  )
}

export { Separator }
