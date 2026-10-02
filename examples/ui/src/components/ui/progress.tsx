'use client'

import type { Variants } from '@toned/core'
import { useStyles } from '@toned/react'
import { stylesheet } from '@toned/systems/base'
import { Progress as ProgressPrimitive } from 'radix-ui'
import type * as React from 'react'

export const progressStyles = stylesheet({
  root: {
    position: 'relative',
    height: '0.5rem',
    width: '100%',
    overflow: 'hidden',
    borderRadius: 'full',
    bgColor: 'action_subtle',
  },
  indicator: {
    bgColor: 'action',
    height: '100%',
    width: '100%',
    borderRadius: 'full',
    // No token: the fill slides to its new value.
    '@platform web': { $style: { transition: 'transform 200ms ease' } },
  },
}).variants(
  ($: Variants<{ size: 'sm' | 'md' | 'lg' }>) => ({
    [$.size('sm')]: { root: { height: '0.25rem' } },
    [$.size('lg')]: { root: { height: '0.75rem' } },
  }),
  { defaults: { size: 'md' } },
)

function Progress({
  className,
  style,
  value,
  max = 100,
  size = 'md',
  ...props
}: React.ComponentProps<typeof ProgressPrimitive.Root> & {
  size?: 'sm' | 'md' | 'lg'
}) {
  const s = useStyles(progressStyles, { size })
  const limit = Number.isFinite(max) && max > 0 ? max : 100
  const amount =
    typeof value === 'number' && Number.isFinite(value)
      ? Math.min(limit, Math.max(0, value))
      : null
  const percent = amount === null ? 0 : (amount / limit) * 100

  return (
    <ProgressPrimitive.Root
      data-slot="progress"
      {...s.root.with({ className, style })}
      {...props}
      max={limit}
      value={amount}
    >
      <ProgressPrimitive.Indicator
        data-slot="progress-indicator"
        {...s.indicator.with({
          $style: { transform: `translateX(-${100 - percent}%)` },
        })}
      />
    </ProgressPrimitive.Root>
  )
}

export { Progress }
