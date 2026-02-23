"use client"

import * as React from "react"
import { Toggle as TogglePrimitive } from "radix-ui"
import { useStyles } from "@toned/react"
import { stylesheet } from "@toned/systems/base"

const toggleStyles = stylesheet({
  root: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    borderRadius: 'medium',
    typo: 'body_small',
    fontWeight: 500,
    cursor: 'pointer',
    style: {
      whiteSpace: 'nowrap',
      outline: 'none',
      transition: 'color 0.15s, box-shadow 0.15s',
      border: 'none',
    },
    ':hover': {
      bgColor: 'muted',
      textColor: 'muted',
    },
  },
  disabled: {
    pointerEvents: 'none',
    opacity: 0.5,
  },
}).variants<{
  variant: 'default' | 'outline'
  size: 'default' | 'sm' | 'lg'
  pressed: boolean
}>(($) => ({
  [$.variant('default')]: {
    root: {
      style: { background: 'transparent' },
    },
  },
  [$.variant('outline')]: {
    root: {
      borderColor: 'default',
      borderWidth: 'thin',
      shadow: 'small',
      style: { background: 'transparent' },
    },
    'root:hover': {
      root: { bgColor: 'subtle', textColor: 'subtle' },
    },
  },
  [$.size('default')]: {
    root: {
      height: '2.25rem',
      paddingX: 2,
      minWidth: '2.25rem',
    },
  },
  [$.size('sm')]: {
    root: {
      height: '2rem',
      minWidth: '2rem',
      paddingY: 0, paddingX: 1.5,
    },
  },
  [$.size('lg')]: {
    root: {
      height: '2.5rem',
      minWidth: '2.5rem',
      paddingY: 0, paddingX: 2.5,
    },
  },
  [$.pressed(true)]: {
    root: { bgColor: 'subtle', textColor: 'subtle' },
  },
}))

function Toggle({
  className,
  disabled,
  variant = "default",
  size = "default",
  pressed: pressedProp,
  defaultPressed,
  onPressedChange,
  ...props
}: React.ComponentProps<typeof TogglePrimitive.Root> & {
  variant?: "default" | "outline"
  size?: "default" | "sm" | "lg"
}) {
  const [internal, setInternal] = React.useState(pressedProp ?? defaultPressed ?? false)
  const pressed = pressedProp ?? internal

  const s = useStyles(toggleStyles, { variant, size, pressed })

  return (
    <TogglePrimitive.Root
      data-slot="toggle"
      pressed={pressedProp}
      defaultPressed={defaultPressed}
      onPressedChange={(val) => {
        setInternal(val)
        onPressedChange?.(val)
      }}
      {...s.root.with(disabled && s.disabled).with({ className })}
      disabled={disabled}
      {...props}
    />
  )
}

export { Toggle, toggleStyles }
