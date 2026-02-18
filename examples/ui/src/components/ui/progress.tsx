"use client"

import * as React from "react"
import { Progress as ProgressPrimitive } from "radix-ui"
import { useStyles } from "@toned/react"
import { stylesheet } from "@toned/systems/base"

const progressStyles = stylesheet({
  root: {
    position: 'relative',
    height: '0.5rem',
    width: '100%',
    overflow: 'hidden',
    borderRadius: 'full',
    style: {
      backgroundColor: 'color-mix(in srgb, var(--primary) 20%, transparent)',
    },
  },
  indicator: {
    bgColor: 'action',
    height: '100%',
    width: '100%',
    style: {
      flex: '1',
      transition: 'all 0.3s',
    },
  },
})

function Progress({
  className,
  value,
  ...props
}: React.ComponentProps<typeof ProgressPrimitive.Root>) {
  const s = useStyles(progressStyles)

  return (
    <ProgressPrimitive.Root
      data-slot="progress"
      {...s.root.with({ className })}
      {...props}
    >
      <ProgressPrimitive.Indicator
        data-slot="progress-indicator"
        {...s.indicator.with({ style: { transform: `translateX(-${100 - (value || 0)}%)` } })}
      />
    </ProgressPrimitive.Root>
  )
}

export { Progress }
