import type { Variants } from '@toned/core'
import { useStyles } from '@toned/react'
import { stylesheet } from '@toned/systems/base'
import { Avatar as AvatarPrimitive } from 'radix-ui'
import type * as React from 'react'

export const avatarStyles = stylesheet({
  root: {
    position: 'relative',
    display: 'flex',
    flexShrink: '0',
    borderRadius: 'full',
    // No token: initials are not selectable text.
    style: { userSelect: 'none' },
  },
  image: {
    width: '100%',
    height: '100%',
    borderRadius: 'full',
    // No token for image fitting.
    style: { objectFit: 'cover' },
  },
  fallback: {
    bgColor: 'action_secondary',
    textColor: 'on_action_secondary',
    display: 'flex',
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 'full',
    fontWeight: 600,
  },
  badge: {
    bgColor: 'status_success',
    position: 'absolute',
    right: 0,
    bottom: 0,
    width: '0.625rem',
    height: '0.625rem',
    borderRadius: 'full',
    // No token: a ring in the page colour separates the dot from the avatar.
    style: { boxShadow: '0 0 0 2px var(--background)' },
  },
  // Overlap and rings for grouped avatars are structural rules in styles.css.
  group: {
    display: 'flex',
    alignItems: 'center',
  },
  groupCount: {
    bgColor: 'muted',
    textColor: 'muted',
    display: 'flex',
    width: '2rem',
    height: '2rem',
    flexShrink: '0',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 'full',
    typo: 'caption',
    fontWeight: 600,
  },
}).variants(
  ($: Variants<{ size: 'default' | 'sm' | 'lg' }>) => ({
    [$.size('sm')]: {
      root: { width: '1.5rem', height: '1.5rem', fontSize: '0.625rem' },
    },
    [$.size('default')]: {
      root: { width: '2rem', height: '2rem', fontSize: '0.75rem' },
    },
    [$.size('lg')]: {
      root: { width: '2.5rem', height: '2.5rem', fontSize: '0.875rem' },
    },
  }),
  { defaults: { size: 'default' } },
)

function Avatar({
  className,
  size = 'default',
  ...props
}: React.ComponentProps<typeof AvatarPrimitive.Root> & {
  size?: 'default' | 'sm' | 'lg'
}) {
  const s = useStyles(avatarStyles, { size })

  return (
    <AvatarPrimitive.Root
      data-slot="avatar"
      data-size={size}
      {...s.root.with({ className })}
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
      {...s.image.with({ className })}
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
      {...s.fallback.with({ className })}
      {...props}
    />
  )
}

function AvatarBadge({ className, ...props }: React.ComponentProps<'span'>) {
  const s = useStyles(avatarStyles)

  return (
    <span
      data-slot="avatar-badge"
      {...s.badge.with({ className })}
      {...props}
    />
  )
}

function AvatarGroup({ className, ...props }: React.ComponentProps<'div'>) {
  const s = useStyles(avatarStyles)

  return (
    <div data-slot="avatar-group" {...s.group.with({ className })} {...props} />
  )
}

function AvatarGroupCount({
  className,
  ...props
}: React.ComponentProps<'div'>) {
  const s = useStyles(avatarStyles)

  return (
    <div
      data-slot="avatar-group-count"
      {...s.groupCount.with({ className })}
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
