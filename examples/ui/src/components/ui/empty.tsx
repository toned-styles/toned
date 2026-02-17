import { useStyles } from "@toned/react"
import { stylesheet } from "@toned/systems/base"

import { cn } from "@/lib/utils"

const emptyStyles = stylesheet({
  root: {
    display: 'flex',
    flexLayout: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderRadius: 'large',
    padding: 6,
    style: {
      minWidth: 0,
      flex: 1,
      borderStyle: 'dashed',
      textAlign: 'center',
      textWrap: 'balance',
    },
    '@md': {
      padding: 12,
    },
  },
  header: {
    display: 'flex',
    flexLayout: 'column',
    alignItems: 'center',
    gap: 2,
    style: {
      maxWidth: '24rem',
      textAlign: 'center',
    },
  },
  media: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    style: {
      flexShrink: 0,
      marginBottom: '0.5rem',
    },
  },
  mediaIcon: {
    bgColor: 'action_secondary',
    textColor: 'default',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 'large',
    style: {
      width: '2.5rem',
      height: '2.5rem',
      flexShrink: 0,
    },
  },
  title: {
    fontWeight: 500,
    style: {
      fontSize: '1.125rem',
      lineHeight: '1.75rem',
      letterSpacing: '-0.025em',
    },
  },
  description: {
    textColor: 'muted',
    typo: 'body_small',
    style: {
      lineHeight: '1.625',
    },
  },
  content: {
    display: 'flex',
    flexLayout: 'column',
    alignItems: 'center',
    gap: 4,
    typo: 'body_small',
    style: {
      width: '100%',
      maxWidth: '24rem',
      minWidth: 0,
      textWrap: 'balance',
    },
  },
})

function Empty({ className, ...props }: React.ComponentProps<"div">) {
  const s = useStyles(emptyStyles)

  return (
    <div
      data-slot="empty"
      className={cn(s.root.className, className)}
      style={s.root.style}
      {...props}
    />
  )
}

function EmptyHeader({ className, ...props }: React.ComponentProps<"div">) {
  const s = useStyles(emptyStyles)

  return (
    <div
      data-slot="empty-header"
      className={cn(s.header.className, className)}
      style={s.header.style}
      {...props}
    />
  )
}

function EmptyMedia({
  className,
  variant = "default",
  ...props
}: React.ComponentProps<"div"> & {
  variant?: "default" | "icon"
}) {
  const s = useStyles(emptyStyles)

  return (
    <div
      data-slot="empty-icon"
      data-variant={variant}
      className={cn(
        variant === 'icon' ? s.mediaIcon.className : s.media.className,
        className,
      )}
      style={variant === 'icon' ? s.mediaIcon.style : s.media.style}
      {...props}
    />
  )
}

function EmptyTitle({ className, ...props }: React.ComponentProps<"div">) {
  const s = useStyles(emptyStyles)

  return (
    <div
      data-slot="empty-title"
      className={cn(s.title.className, className)}
      style={s.title.style}
      {...props}
    />
  )
}

function EmptyDescription({ className, ...props }: React.ComponentProps<"p">) {
  const s = useStyles(emptyStyles)

  return (
    <div
      data-slot="empty-description"
      className={cn(s.description.className, className)}
      style={s.description.style}
      {...props}
    />
  )
}

function EmptyContent({ className, ...props }: React.ComponentProps<"div">) {
  const s = useStyles(emptyStyles)

  return (
    <div
      data-slot="empty-content"
      className={cn(s.content.className, className)}
      style={s.content.style}
      {...props}
    />
  )
}

export {
  Empty,
  EmptyHeader,
  EmptyTitle,
  EmptyDescription,
  EmptyContent,
  EmptyMedia,
}
