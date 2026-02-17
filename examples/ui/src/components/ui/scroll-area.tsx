import * as React from "react"
import { ScrollArea as ScrollAreaPrimitive } from "radix-ui"
import { useStyles } from "@toned/react"
import { stylesheet } from "@toned/systems/base"

import { cn } from "@/lib/utils"

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
      transition: 'background-color 0.15s',
      userSelect: 'none',
    },
  },
  thumb: {
    bgColor: 'subtle',
    borderRadius: 'full',
    position: 'relative',
    style: { flex: 1 },
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
      className={cn(s.root.className, className)}
      style={s.root.style}
      {...props}
    >
      <ScrollAreaPrimitive.Viewport
        data-slot="scroll-area-viewport"
        className={s.viewport.className}
        style={s.viewport.style}
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
      className={cn(s.scrollbar.className, className)}
      style={{
        ...s.scrollbar.style,
        ...(orientation === "vertical"
          ? { height: '100%', width: '10px', borderLeft: '1px solid transparent' }
          : { height: '10px', flexDirection: 'column' as const, borderTop: '1px solid transparent' }
        ),
      }}
      {...props}
    >
      <ScrollAreaPrimitive.ScrollAreaThumb
        data-slot="scroll-area-thumb"
        className={s.thumb.className}
        style={s.thumb.style}
      />
    </ScrollAreaPrimitive.ScrollAreaScrollbar>
  )
}

export { ScrollArea, ScrollBar }
