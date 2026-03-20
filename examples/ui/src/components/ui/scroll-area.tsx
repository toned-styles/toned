import * as React from "react"
import { ScrollArea as ScrollAreaPrimitive } from "radix-ui"
import { useStyles } from "@toned/react"
import { stylesheet } from "@toned/systems/base"

const scrollAreaStyles = stylesheet({
  root: {
    position: 'relative',
  },
  viewport: {
    width: '100%',
    height: '100%',
    style: {
      borderRadius: 'inherit',
      outline: 'none',
      transition: 'color 0.15s, box-shadow 0.15s',
    },
  },
  scrollbar: {
    display: 'flex',
    style: {
      touchAction: 'none',
      padding: '1px',
      transition: 'background 150ms',
      userSelect: 'none',
    },
    ':hover': {
      style: {
        background: 'color-mix(in srgb, var(--border) 50%, transparent)',
      },
    },
  },
  thumb: {
    bgColor: 'subtle',
    borderRadius: 'full',
    position: 'relative',
    style: {
      flex: 1,
      transition: 'background 150ms',
    },
  },
})

function ScrollArea({
  className,
  children,
  ...props
}: React.ComponentProps<typeof ScrollAreaPrimitive.Root>) {
  const s = useStyles(scrollAreaStyles)

  return (
    <ScrollAreaPrimitive.Root
      data-slot="scroll-area"
      {...s.root.with({ className })}
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
  orientation = "vertical",
  ...props
}: React.ComponentProps<typeof ScrollAreaPrimitive.ScrollAreaScrollbar>) {
  const s = useStyles(scrollAreaStyles)

  return (
    <ScrollAreaPrimitive.ScrollAreaScrollbar
      data-slot="scroll-area-scrollbar"
      orientation={orientation}
      {...s.scrollbar.with({
        className,
        style: orientation === "vertical"
          ? { height: '100%', width: '10px', borderLeft: '1px solid transparent' }
          : { height: '10px', flexDirection: 'column' as const, borderTop: '1px solid transparent' },
      })}
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
