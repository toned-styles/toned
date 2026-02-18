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
}).variants<{
  variant: 'default' | 'outline'
  size: 'default' | 'sm' | 'lg'
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
      style: { padding: '0 0.375rem' },
    },
  },
  [$.size('lg')]: {
    root: {
      height: '2.5rem',
      minWidth: '2.5rem',
      style: { padding: '0 0.625rem' },
    },
  },
}))

function Toggle({
  className,
  variant = "default",
  size = "default",
  ...props
}: React.ComponentProps<typeof TogglePrimitive.Root> & {
  variant?: "default" | "outline"
  size?: "default" | "sm" | "lg"
}) {
  const s = useStyles(toggleStyles, { variant, size })

  return (
    <TogglePrimitive.Root
      data-slot="toggle"
      {...s.root.with({ className })}
      {...props}
    />
  )
}

export { Toggle, toggleStyles }
