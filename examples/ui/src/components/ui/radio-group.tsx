import * as React from "react"
import { CircleIcon } from "lucide-react"
import { RadioGroup as RadioGroupPrimitive } from "radix-ui"
import { useStyles } from "@toned/react"
import { stylesheet } from "@toned/systems/base"

const radioGroupStyles = stylesheet({
  root: {
    display: 'grid',
    gap: 3,
  },
  item: {
    borderColor: 'input',
    borderWidth: 'thin',
    textColor: 'action',
    width: '1rem',
    height: '1rem',
    flexShrink: '0',
    borderRadius: 'full',
    shadow: 'small',
    style: {
      aspectRatio: '1',
      outline: 'none',
      transition: 'color 0.15s, box-shadow 0.15s',
    },
  },
  indicator: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
})

function RadioGroup({
  className,
  ...props
}: React.ComponentProps<typeof RadioGroupPrimitive.Root>) {
  const s = useStyles(radioGroupStyles)

  return (
    <RadioGroupPrimitive.Root
      data-slot="radio-group"
      {...s.root.with({ className })}
      {...props}
    />
  )
}

function RadioGroupItem({
  className,
  ...props
}: React.ComponentProps<typeof RadioGroupPrimitive.Item>) {
  const s = useStyles(radioGroupStyles)

  return (
    <RadioGroupPrimitive.Item
      data-slot="radio-group-item"
      {...s.item.with({ className })}
      {...props}
    >
      <RadioGroupPrimitive.Indicator
        data-slot="radio-group-indicator"
        {...s.indicator}
      >
        <CircleIcon className="fill-primary absolute top-1/2 left-1/2 size-2 -translate-x-1/2 -translate-y-1/2" />
      </RadioGroupPrimitive.Indicator>
    </RadioGroupPrimitive.Item>
  )
}

export { RadioGroup, RadioGroupItem }
