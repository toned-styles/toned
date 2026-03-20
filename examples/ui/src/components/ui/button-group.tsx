import { Slot } from "radix-ui"
import { useStyles } from "@toned/react"
import { stylesheet } from "@toned/systems/base"

import { cn } from "@/lib/utils"
import { Separator } from "@/components/ui/separator"

const buttonGroupStyles = stylesheet({
  root: {
    display: 'flex',
    alignItems: 'stretch',
    style: {
      width: 'fit-content',
    },
  },
  text: {
    bgColor: 'action_secondary',
    display: 'flex',
    alignItems: 'center',
    gap: 2,
    borderColor: 'default',
    borderWidth: 'thin',
    borderRadius: 'medium',
    typo: 'body_small',
    fontWeight: 500,
    shadow: 'small',
    paddingX: 4,
  },
})

function ButtonGroup({
  className,
  orientation = "horizontal",
  ...props
}: React.ComponentProps<"div"> & {
  orientation?: "horizontal" | "vertical"
}) {
  const s = useStyles(buttonGroupStyles)

  return (
    <div
      role="group"
      data-slot="button-group"
      data-orientation={orientation}
      {...s.root.with({
        className,
        style: orientation === 'vertical' ? { flexDirection: 'column' } : undefined,
      })}
      {...props}
    />
  )
}

function ButtonGroupText({
  className,
  asChild = false,
  ...props
}: React.ComponentProps<"div"> & {
  asChild?: boolean
}) {
  const Comp = asChild ? Slot.Root : "div"
  const s = useStyles(buttonGroupStyles)

  return (
    <Comp
      {...s.text.with({ className })}
      {...props}
    />
  )
}

function ButtonGroupSeparator({
  className,
  orientation = "vertical",
  ...props
}: React.ComponentProps<typeof Separator>) {
  return (
    <Separator
      data-slot="button-group-separator"
      orientation={orientation}
      className={cn(className)}
      style={{ margin: 0, alignSelf: 'stretch', ...(orientation === 'vertical' ? { height: 'auto' } : undefined) }}
      {...props}
    />
  )
}

export {
  ButtonGroup,
  ButtonGroupSeparator,
  ButtonGroupText,
}
