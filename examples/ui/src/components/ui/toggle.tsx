"use client"

import * as React from "react"
import { Toggle as TogglePrimitive } from "radix-ui"
import { useStyles } from "@toned/react"
import { stylesheet } from "@toned/systems/base"

import { cn } from "@/lib/utils"

const toggleStyles = stylesheet({
  root: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    borderRadius: 'medium',
    typo: 'body_small',
    fontWeight: 500,
    style: {
      whiteSpace: 'nowrap',
      outline: 'none',
      transition: 'color 0.15s, box-shadow 0.15s',
      border: 'none',
      cursor: 'pointer',
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
  },
  [$.size('default')]: {
    root: {
      height: '2.25rem',
      paddingX: 2,
      style: { minWidth: '2.25rem' },
    },
  },
  [$.size('sm')]: {
    root: {
      height: '2rem',
      style: { padding: '0 0.375rem', minWidth: '2rem' },
    },
  },
  [$.size('lg')]: {
    root: {
      height: '2.5rem',
      style: { padding: '0 0.625rem', minWidth: '2.5rem' },
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
      className={cn(s.root.className, className)}
      style={s.root.style}
      {...props}
    />
  )
}

export { Toggle, toggleStyles }
