import { useStyles } from '@toned/react'
import { stylesheet } from '@toned/systems/base'
import { HoverCard as HoverCardPrimitive } from 'radix-ui'
import type * as React from 'react'

// The open and close animations are keyed on `data-state` in styles.css.
export const hoverCardStyles = stylesheet({
  content: {
    bgColor: 'elevated',
    textColor: 'default',
    zIndex: 50,
    width: '18rem',
    padding: 4,
    borderRadius: 'large',
    borderColor: 'default',
    borderWidth: 'thin',
    shadow: 'large',
    typo: 'body_small',
  },
})

function HoverCard({
  ...props
}: React.ComponentProps<typeof HoverCardPrimitive.Root>) {
  return <HoverCardPrimitive.Root data-slot="hover-card" {...props} />
}

function HoverCardTrigger({
  ...props
}: React.ComponentProps<typeof HoverCardPrimitive.Trigger>) {
  return (
    <HoverCardPrimitive.Trigger data-slot="hover-card-trigger" {...props} />
  )
}

function HoverCardContent({
  className,
  align = 'center',
  sideOffset = 4,
  ...props
}: React.ComponentProps<typeof HoverCardPrimitive.Content>) {
  const s = useStyles(hoverCardStyles)

  return (
    <HoverCardPrimitive.Portal data-slot="hover-card-portal">
      <HoverCardPrimitive.Content
        data-slot="hover-card-content"
        align={align}
        sideOffset={sideOffset}
        {...s.content.with({ className })}
        {...props}
      />
    </HoverCardPrimitive.Portal>
  )
}

export { HoverCard, HoverCardTrigger, HoverCardContent }
