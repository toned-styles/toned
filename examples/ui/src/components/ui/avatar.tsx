import * as React from "react"
import { Avatar as AvatarPrimitive } from "radix-ui"
import { useStyles } from "@toned/react"
import { stylesheet } from "@toned/systems/base"

import { cn } from "@/lib/utils"

const avatarStyles = stylesheet({
  root: {
    position: 'relative',
    display: 'flex',
    width: '2rem',
    height: '2rem',
    flexShrink: '0',
    overflow: 'hidden',
    borderRadius: 'full',
    style: { userSelect: 'none' },
  },
  image: {
    width: '100%',
    height: '100%',
    style: { aspectRatio: '1', objectFit: 'cover' },
  },
  fallback: {
    bgColor: 'muted',
    textColor: 'muted',
    display: 'flex',
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 'full',
    typo: 'body_small',
  },
  badge: {
    bgColor: 'action',
    textColor: 'on_action',
    position: 'absolute',
    zIndex: 10,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 'full',
    style: {
      right: 0,
      bottom: 0,
      userSelect: 'none',
      boxShadow: '0 0 0 2px var(--background)',
    },
  },
  group: {
    display: 'flex',
    style: { marginLeft: '-8px' },
  },
  groupCount: {
    bgColor: 'muted',
    textColor: 'muted',
    position: 'relative',
    display: 'flex',
    width: '2rem',
    height: '2rem',
    flexShrink: '0',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 'full',
    typo: 'body_small',
    style: {
      boxShadow: '0 0 0 2px var(--background)',
    },
  },
})

function Avatar({
  className,
  size = "default",
  ...props
}: React.ComponentProps<typeof AvatarPrimitive.Root> & {
  size?: "default" | "sm" | "lg"
}) {
  const s = useStyles(avatarStyles)

  return (
    <AvatarPrimitive.Root
      data-slot="avatar"
      data-size={size}
      className={cn(s.root.className, className)}
      style={s.root.style}
      {...props}
    />
  )
}

function AvatarImage({
  className,
  ...props
}: React.ComponentProps<typeof AvatarPrimitive.Image>) {
  const s = useStyles(avatarStyles)

  return (
    <AvatarPrimitive.Image
      data-slot="avatar-image"
      className={cn(s.image.className, className)}
      style={s.image.style}
      {...props}
    />
  )
}

function AvatarFallback({
  className,
  ...props
}: React.ComponentProps<typeof AvatarPrimitive.Fallback>) {
  const s = useStyles(avatarStyles)

  return (
    <AvatarPrimitive.Fallback
      data-slot="avatar-fallback"
      className={cn(s.fallback.className, className)}
      style={s.fallback.style}
      {...props}
    />
  )
}

function AvatarBadge({ className, ...props }: React.ComponentProps<"span">) {
  const s = useStyles(avatarStyles)

  return (
    <span
      data-slot="avatar-badge"
      className={cn(s.badge.className, className)}
      style={s.badge.style}
      {...props}
    />
  )
}

function AvatarGroup({ className, ...props }: React.ComponentProps<"div">) {
  const s = useStyles(avatarStyles)

  return (
    <div
      data-slot="avatar-group"
      className={cn(s.group.className, className)}
      style={s.group.style}
      {...props}
    />
  )
}

function AvatarGroupCount({
  className,
  ...props
}: React.ComponentProps<"div">) {
  const s = useStyles(avatarStyles)

  return (
    <div
      data-slot="avatar-group-count"
      className={cn(s.groupCount.className, className)}
      style={s.groupCount.style}
      {...props}
    />
  )
}

export {
  Avatar,
  AvatarImage,
  AvatarFallback,
  AvatarBadge,
  AvatarGroup,
  AvatarGroupCount,
}
