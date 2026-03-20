import * as React from "react"
import { Slot } from "radix-ui"
import { useStyles } from "@toned/react"
import { stylesheet } from "@toned/systems/base"

const buttonStyles = stylesheet({
  root: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    flexShrink: '0',
    borderRadius: 'medium',
    typo: 'label_small',
    shadow: 'small',
    cursor: 'pointer',
    style: {
      whiteSpace: 'nowrap' as const,
      transition: 'color 0.15s, background-color 0.15s, border-color 0.15s, box-shadow 0.15s, opacity 0.15s, text-decoration 0.15s',
    },
  },
  disabled: {
    pointerEvents: 'none',
    opacity: 0.5,
  },
}).variants<{
  variant: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link'
  size: 'default' | 'xs' | 'sm' | 'lg' | 'icon' | 'icon-xs' | 'icon-sm' | 'icon-lg'
}>(($) => ({
  // Variants
  [$.variant('default')]: {
    root: { bgColor: 'action', textColor: 'on_action' },
    'root:hover': {
      root: { opacity: 0.9 },
    },
  },
  [$.variant('destructive')]: {
    root: {
      bgColor: 'destructive',
      textColor: 'on_destructive',
      shadow: 'none',
    },
    'root:hover': {
      root: { opacity: 0.9 },
    },
  },
  [$.variant('outline')]: {
    root: {
      bgColor: 'default',
      borderColor: 'default',
      borderWidth: 'thin',
      shadow: 'small',
    },
    'root:hover': {
      root: { bgColor: 'subtle', textColor: 'subtle' },
    },
  },
  [$.variant('secondary')]: {
    root: {
      bgColor: 'action_secondary',
      textColor: 'on_action_secondary',
      shadow: 'none',
    },
    'root:hover': {
      root: { opacity: 0.8 },
    },
  },
  [$.variant('ghost')]: {
    root: {
      shadow: 'none',
    },
    'root:hover': {
      root: { bgColor: 'subtle', textColor: 'subtle' },
    },
  },
  [$.variant('link')]: {
    root: {
      textColor: 'action',
      shadow: 'none',
      style: { textUnderlineOffset: '4px' },
    },
    'root:hover': {
      root: { style: { textDecoration: 'underline' } },
    },
  },
  // Sizes
  [$.size('default')]: {
    root: { height: '2.25rem', paddingX: 4, paddingY: 2 },
  },
  [$.size('xs')]: {
    root: {
      height: '1.5rem',
      gap: 1,
      borderRadius: 'medium',
      paddingX: 2,
      fontSize: '0.75rem',
    },
  },
  [$.size('sm')]: {
    root: { height: '2rem', borderRadius: 'medium', gap: 1.5, paddingX: 3 },
  },
  [$.size('lg')]: {
    root: { height: '2.5rem', borderRadius: 'medium', paddingX: 6 },
  },
  [$.size('icon')]: {
    root: { width: '2.25rem', height: '2.25rem' },
  },
  [$.size('icon-xs')]: {
    root: { width: '1.5rem', height: '1.5rem', borderRadius: 'medium' },
  },
  [$.size('icon-sm')]: {
    root: { width: '2rem', height: '2rem' },
  },
  [$.size('icon-lg')]: {
    root: { width: '2.5rem', height: '2.5rem' },
  },
}))

type ButtonVariant = 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link'
type ButtonSize = 'default' | 'xs' | 'sm' | 'lg' | 'icon' | 'icon-xs' | 'icon-sm' | 'icon-lg'

function Button({
  className,
  variant = "default",
  size = "default",
  asChild = false,
  disabled,
  ...props
}: React.ComponentProps<"button"> & {
  variant?: ButtonVariant
  size?: ButtonSize
  asChild?: boolean
}) {
  const Comp = asChild ? Slot.Root : "button"
  const s = useStyles(buttonStyles, { variant, size })

  return (
    <Comp
      data-slot="button"
      data-variant={variant}
      data-size={size}
      {...s.root.with(disabled && s.disabled).with({ className })}
      disabled={disabled}
      {...props}
    />
  )
}

export { Button, buttonStyles }
