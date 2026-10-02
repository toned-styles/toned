'use client'

import { Direction } from 'radix-ui'
import type * as React from 'react'

type ReadingDirection = React.ComponentProps<
  typeof Direction.DirectionProvider
>['dir']

function DirectionProvider({
  dir,
  direction,
  children,
}: {
  /** Reading direction. `direction` is an alias and wins when both are set. */
  dir?: ReadingDirection
  direction?: ReadingDirection
  children?: React.ReactNode
}) {
  return (
    <Direction.DirectionProvider dir={direction ?? dir ?? 'ltr'}>
      {children}
    </Direction.DirectionProvider>
  )
}

const useDirection = Direction.useDirection

export { DirectionProvider, useDirection }
