import * as React from "react"
import { Tooltip as TooltipPrimitive } from "radix-ui"
import { useStyles } from "@toned/react"
import { stylesheet } from "@toned/systems/base"

const tooltipStyles = stylesheet({
  content: {
    bgColor: 'emphasized',
    textColor: 'on_action',
    zIndex: 50,
    borderRadius: 'medium',
    paddingX: 3,
    paddingY: 1.5,
    typo: 'caption',
    style: {
      width: 'fit-content',
      textWrap: 'balance',
      transformOrigin: 'var(--radix-tooltip-content-transform-origin)',
      animation: 'fade-in 0.15s ease, zoom-in 0.15s ease',
    },
  },
  arrow: {
    bgColor: 'emphasized',
    svgFill: 'default',
    zIndex: 50,
    width: '0.625rem',
    height: '0.625rem',
    borderRadius: 'small',
    style: {
      transform: 'translateY(calc(-50% - 2px)) rotate(45deg)',
    },
  },
})

function TooltipProvider({
  delayDuration = 0,
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
  sideOffset = 0,
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
        <TooltipPrimitive.Arrow
          {...s.arrow}
        />
      </TooltipPrimitive.Content>
    </TooltipPrimitive.Portal>
  )
}

export { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider }
