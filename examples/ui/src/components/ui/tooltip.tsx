import { useStyles } from '@toned/react'
import { stylesheet } from '@toned/systems/base'
import { Tooltip as TooltipPrimitive } from 'radix-ui'
import type * as React from 'react'

// The open and close animations are keyed on `data-state` in styles.css.
export const tooltipStyles = stylesheet({
  content: {
    bgColor: 'emphasized',
    textColor: 'on_action',
    zIndex: 50,
    width: 'fit-content',
    maxWidth: '16rem',
    paddingX: 2.5,
    paddingY: 1.5,
    borderRadius: 'medium',
    typo: 'caption',
    fontWeight: 500,
  },
  arrow: {
    svgFill: 'default',
    width: '0.625rem',
    height: '0.3125rem',
  },
})

function TooltipProvider({
  delayDuration = 200,
  ...props
}: React.ComponentProps<typeof TooltipPrimitive.Provider>) {
  return (
    <TooltipPrimitive.Provider
      data-slot="tooltip-provider"
      delayDuration={delayDuration}
      {...props}
    />
  )
}

function Tooltip({
  ...props
}: React.ComponentProps<typeof TooltipPrimitive.Root>) {
  return <TooltipPrimitive.Root data-slot="tooltip" {...props} />
}

function TooltipTrigger({
  ...props
}: React.ComponentProps<typeof TooltipPrimitive.Trigger>) {
  return <TooltipPrimitive.Trigger data-slot="tooltip-trigger" {...props} />
}

function TooltipContent({
  className,
  sideOffset = 6,
  children,
  ...props
}: React.ComponentProps<typeof TooltipPrimitive.Content>) {
  const s = useStyles(tooltipStyles)

  return (
    <TooltipPrimitive.Portal>
      <TooltipPrimitive.Content
        data-slot="tooltip-content"
        sideOffset={sideOffset}
        {...s.content.with({ className })}
        {...props}
      >
        {children}
        <TooltipPrimitive.Arrow data-slot="tooltip-arrow" {...s.arrow} />
      </TooltipPrimitive.Content>
    </TooltipPrimitive.Portal>
  )
}

export { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider }
