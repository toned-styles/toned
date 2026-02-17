import * as React from "react"
import { Slot } from "radix-ui"
import { useStyles } from "@toned/react"
import { stylesheet } from "@toned/systems/base"

import { cn } from "@/lib/utils"
import { Separator } from "@/components/ui/separator"

const itemStyles = stylesheet({
  group: {
    display: 'flex',
    flexLayout: 'column',
  },
  root: {
    display: 'flex',
    alignItems: 'center',
    borderRadius: 'medium',
    typo: 'body_small',
    style: {
      borderWidth: '1px',
      borderStyle: 'solid',
      borderColor: 'transparent',
      transition: 'color 0.1s',
      flexWrap: 'wrap',
      outline: 'none',
    },
  },
  rootDefault: {
    style: {
      background: 'transparent',
    },
  },
  rootOutline: {
    borderColor: 'default',
  },
  rootMuted: {
    style: {
      background: 'color-mix(in srgb, var(--muted) 50%, transparent)',
    },
  },
  sizeDefault: {
    padding: 4,
    gap: 4,
  },
  sizeSm: {
    paddingX: 4,
    paddingY: 3,
    gap: 2.5,
  },
  media: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    style: {
      flexShrink: 0,
    },
  },
  mediaIcon: {
    bgColor: 'action_secondary',
    borderColor: 'default',
    borderWidth: 'thin',
    borderRadius: 'small',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    style: {
      width: '2rem',
      height: '2rem',
    },
  },
  mediaImage: {
    borderRadius: 'small',
    style: {
      width: '2.5rem',
      height: '2.5rem',
      overflow: 'hidden',
    },
  },
  content: {
    display: 'flex',
    flexLayout: 'column',
    gap: 1,
    style: {
      flex: 1,
    },
  },
  title: {
    display: 'flex',
    alignItems: 'center',
    gap: 2,
    typo: 'body_small',
    fontWeight: 500,
    style: {
      width: 'fit-content',
      lineHeight: '1.4',
    },
  },
  description: {
    textColor: 'muted',
    typo: 'body_small',
    style: {
      lineHeight: '1.5',
      fontWeight: 400,
      textWrap: 'balance',
      display: '-webkit-box',
      WebkitLineClamp: 2,
      WebkitBoxOrient: 'vertical',
      overflow: 'hidden',
    },
  },
  actions: {
    display: 'flex',
    alignItems: 'center',
    gap: 2,
  },
  headerFooter: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 2,
    style: {
      flexBasis: '100%',
    },
  },
})

function ItemGroup({ className, ...props }: React.ComponentProps<"div">) {
  const s = useStyles(itemStyles)

  return (
    <div
      role="list"
      data-slot="item-group"
      className={cn("group/item-group", s.group.className, className)}
      style={s.group.style}
      {...props}
    />
  )
}

function ItemSeparator({
  className,
  ...props
}: React.ComponentProps<typeof Separator>) {
  return (
    <Separator
      data-slot="item-separator"
      orientation="horizontal"
      className={cn(className)}
      style={{ marginTop: 0, marginBottom: 0 }}
      {...props}
    />
  )
}

function Item({
  className,
  variant = "default",
  size = "default",
  asChild = false,
  ...props
}: React.ComponentProps<"div"> & {
  variant?: "default" | "outline" | "muted"
  size?: "default" | "sm"
  asChild?: boolean
}) {
  const Comp = asChild ? Slot.Root : "div"
  const s = useStyles(itemStyles)

  const variantStyles = variant === 'outline' ? s.rootOutline
    : variant === 'muted' ? s.rootMuted
    : s.rootDefault

  const sizeStyles = size === 'sm' ? s.sizeSm : s.sizeDefault

  return (
    <Comp
      data-slot="item"
      data-variant={variant}
      data-size={size}
      className={cn("group/item", s.root.className, variantStyles.className, sizeStyles.className, className)}
      style={{ ...s.root.style, ...variantStyles.style, ...sizeStyles.style }}
      {...props}
    />
  )
}

function ItemMedia({
  className,
  variant = "default",
  ...props
}: React.ComponentProps<"div"> & {
  variant?: "default" | "icon" | "image"
}) {
  const s = useStyles(itemStyles)

  const variantStyle = variant === 'icon' ? s.mediaIcon
    : variant === 'image' ? s.mediaImage
    : s.media

  return (
    <div
      data-slot="item-media"
      data-variant={variant}
      className={cn(s.media.className, variantStyle.className, className)}
      style={{ ...s.media.style, ...variantStyle.style }}
      {...props}
    />
  )
}

function ItemContent({ className, ...props }: React.ComponentProps<"div">) {
  const s = useStyles(itemStyles)

  return (
    <div
      data-slot="item-content"
      className={cn(s.content.className, className)}
      style={s.content.style}
      {...props}
    />
  )
}

function ItemTitle({ className, ...props }: React.ComponentProps<"div">) {
  const s = useStyles(itemStyles)

  return (
    <div
      data-slot="item-title"
      className={cn(s.title.className, className)}
      style={s.title.style}
      {...props}
    />
  )
}

function ItemDescription({ className, ...props }: React.ComponentProps<"p">) {
  const s = useStyles(itemStyles)

  return (
    <p
      data-slot="item-description"
      className={cn(s.description.className, className)}
      style={s.description.style}
      {...props}
    />
  )
}

function ItemActions({ className, ...props }: React.ComponentProps<"div">) {
  const s = useStyles(itemStyles)

  return (
    <div
      data-slot="item-actions"
      className={cn(s.actions.className, className)}
      style={s.actions.style}
      {...props}
    />
  )
}

function ItemHeader({ className, ...props }: React.ComponentProps<"div">) {
  const s = useStyles(itemStyles)

  return (
    <div
      data-slot="item-header"
      className={cn(s.headerFooter.className, className)}
      style={s.headerFooter.style}
      {...props}
    />
  )
}

function ItemFooter({ className, ...props }: React.ComponentProps<"div">) {
  const s = useStyles(itemStyles)

  return (
    <div
      data-slot="item-footer"
      className={cn(s.headerFooter.className, className)}
      style={s.headerFooter.style}
      {...props}
    />
  )
}

export {
  Item,
  ItemMedia,
  ItemContent,
  ItemActions,
  ItemGroup,
  ItemSeparator,
  ItemTitle,
  ItemDescription,
  ItemHeader,
  ItemFooter,
}
