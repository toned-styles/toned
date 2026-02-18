import * as React from "react"
import { Popover as PopoverPrimitive } from "radix-ui"
import { useStyles } from "@toned/react"
import { stylesheet } from "@toned/systems/base"

const popoverStyles = stylesheet({
  content: {
    bgColor: 'elevated',
    textColor: 'default',
    zIndex: 50,
    borderRadius: 'medium',
    borderColor: 'default',
    borderWidth: 'thin',
    padding: 4,
    shadow: 'medium',
    style: {
      width: '18rem',
      outline: 'none',
      transformOrigin: 'var(--radix-popover-content-transform-origin)',
      animation: 'fade-in 0.15s ease, zoom-in 0.15s ease',
    },
  },
  header: {
    flexLayout: 'column',
    gap: 1,
    typo: 'body_small',
  },
  title: {
    fontWeight: 500,
  },
  description: {
    textColor: 'muted',
  },
})

function Popover({
  ...props
}: React.ComponentProps<typeof PopoverPrimitive.Root>) {
  return <PopoverPrimitive.Root data-slot="popover" {...props} />
}

function PopoverTrigger({
  ...props
}: React.ComponentProps<typeof PopoverPrimitive.Trigger>) {
  return <PopoverPrimitive.Trigger data-slot="popover-trigger" {...props} />
}

function PopoverContent({
  className,
  align = "center",
  sideOffset = 4,
  ...props
}: React.ComponentProps<typeof PopoverPrimitive.Content>) {
  const s = useStyles(popoverStyles)

  return (
    <PopoverPrimitive.Portal>
      <PopoverPrimitive.Content
        data-slot="popover-content"
        align={align}
        sideOffset={sideOffset}
        {...s.content.with({ className })}
        {...props}
      />
    </PopoverPrimitive.Portal>
  )
}

function PopoverAnchor({
  ...props
}: React.ComponentProps<typeof PopoverPrimitive.Anchor>) {
  return <PopoverPrimitive.Anchor data-slot="popover-anchor" {...props} />
}

function PopoverHeader({ className, ...props }: React.ComponentProps<"div">) {
  const s = useStyles(popoverStyles)

  return (
    <div
      data-slot="popover-header"
      {...s.header.with({ className })}
      {...props}
    />
  )
}

function PopoverTitle({ className, ...props }: React.ComponentProps<"h2">) {
  const s = useStyles(popoverStyles)

  return (
    <div
      data-slot="popover-title"
      {...s.title.with({ className })}
      {...props}
    />
  )
}

function PopoverDescription({
  className,
  ...props
}: React.ComponentProps<"p">) {
  const s = useStyles(popoverStyles)

  return (
    <p
      data-slot="popover-description"
      {...s.description.with({ className })}
      {...props}
    />
  )
}

export {
  Popover,
  PopoverTrigger,
  PopoverContent,
  PopoverAnchor,
  PopoverHeader,
  PopoverTitle,
  PopoverDescription,
}
