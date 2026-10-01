import type { Variants } from '@toned/core'
import { useStyles } from '@toned/react'
import { stylesheet } from '@toned/systems/base'
import { ScrollArea as ScrollAreaPrimitive } from 'radix-ui'
import type * as React from 'react'

export const scrollAreaStyles = stylesheet({
  root: {
    position: 'relative',
    overflow: 'hidden',
  },
  viewport: {
    width: '100%',
    height: '100%',
    // No token: the viewport follows the root's corners.
    style: { borderRadius: 'inherit' },
    ':focus-visible': { shadow: 'focus' },
  },
  scrollbar: {
    display: 'flex',
    padding: 0.5,
    // No tokens: dragging the bar must not scroll the page or select text.
    style: { touchAction: 'none', userSelect: 'none' },
  },
  thumb: {
    position: 'relative',
    flexGrow: '1',
    bgColor: 'interactive_muted',
    borderRadius: 'full',
  },
}).variants(
  ($: Variants<{ orientation: 'vertical' | 'horizontal' }>) => ({
    [$.orientation('vertical')]: {
      scrollbar: { height: '100%', width: '0.625rem' },
    },
    [$.orientation('horizontal')]: {
      scrollbar: { flexLayout: 'column', height: '0.625rem' },
    },
  }),
  { defaults: { orientation: 'vertical' } },
)

function ScrollArea({
  className,
  style,
  children,
  ...props
}: React.ComponentProps<typeof ScrollAreaPrimitive.Root>) {
  const s = useStyles(scrollAreaStyles)

  return (
    <ScrollAreaPrimitive.Root
      data-slot="scroll-area"
      {...s.root.with({ className, style })}
      {...props}
    >
      <ScrollAreaPrimitive.Viewport
        data-slot="scroll-area-viewport"
        {...s.viewport}
      >
        {children}
      </ScrollAreaPrimitive.Viewport>
      <ScrollBar />
      <ScrollAreaPrimitive.Corner />
    </ScrollAreaPrimitive.Root>
  )
}

function ScrollBar({
  className,
  orientation = 'vertical',
  ...props
}: React.ComponentProps<typeof ScrollAreaPrimitive.ScrollAreaScrollbar>) {
  const s = useStyles(scrollAreaStyles, { orientation })

  return (
    <ScrollAreaPrimitive.ScrollAreaScrollbar
      data-slot="scroll-area-scrollbar"
      orientation={orientation}
      {...s.scrollbar.with({ className })}
      {...props}
    >
      <ScrollAreaPrimitive.ScrollAreaThumb
        data-slot="scroll-area-thumb"
        {...s.thumb}
      />
    </ScrollAreaPrimitive.ScrollAreaScrollbar>
  )
}

export { ScrollArea, ScrollBar }
