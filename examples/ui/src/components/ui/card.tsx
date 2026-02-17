import * as React from "react"
import { useStyles } from "@toned/react"
import { stylesheet } from "@toned/systems/base"

import { cn } from "@/lib/utils"

const cardStyles = stylesheet({
  root: {
    bgColor: 'elevated',
    textColor: 'default',
    flexLayout: 'column',
    gap: 6,
    borderRadius: 'xlarge',
    borderColor: 'default',
    borderWidth: 'thin',
    paddingY: 6,
    shadow: 'small',
  },
  header: {
    paddingX: 6,
    style: {
      display: 'grid',
      gridAutoRows: 'min-content',
      gridTemplateRows: 'auto auto',
      alignItems: 'start',
      gap: '8px',
    },
  },
  title: {
    fontWeight: 600,
    lineHeight: '1',
  },
  description: {
    textColor: 'muted',
    typo: 'body_small',
  },
  action: {
    style: {
      gridColumnStart: 2,
      gridRowStart: 1,
      gridRowEnd: 'span 2',
      alignSelf: 'start',
      justifySelf: 'end',
    },
  },
  content: {
    paddingX: 6,
  },
  footer: {
    display: 'flex',
    alignItems: 'center',
    paddingX: 6,
  },
})

function Card({ className, ...props }: React.ComponentProps<"div">) {
  const s = useStyles(cardStyles)

  return (
    <div
      data-slot="card"
      className={cn(s.root.className, className)}
      style={s.root.style}
      {...props}
    />
  )
}

function CardHeader({ className, ...props }: React.ComponentProps<"div">) {
  const s = useStyles(cardStyles)

  return (
    <div
      data-slot="card-header"
      className={cn(s.header.className, className)}
      style={s.header.style}
      {...props}
    />
  )
}

function CardTitle({ className, ...props }: React.ComponentProps<"div">) {
  const s = useStyles(cardStyles)

  return (
    <div
      data-slot="card-title"
      className={cn(s.title.className, className)}
      style={s.title.style}
      {...props}
    />
  )
}

function CardDescription({ className, ...props }: React.ComponentProps<"div">) {
  const s = useStyles(cardStyles)

  return (
    <div
      data-slot="card-description"
      className={cn(s.description.className, className)}
      style={s.description.style}
      {...props}
    />
  )
}

function CardAction({ className, ...props }: React.ComponentProps<"div">) {
  const s = useStyles(cardStyles)

  return (
    <div
      data-slot="card-action"
      className={cn(s.action.className, className)}
      style={s.action.style}
      {...props}
    />
  )
}

function CardContent({ className, ...props }: React.ComponentProps<"div">) {
  const s = useStyles(cardStyles)

  return (
    <div
      data-slot="card-content"
      className={cn(s.content.className, className)}
      style={s.content.style}
      {...props}
    />
  )
}

function CardFooter({ className, ...props }: React.ComponentProps<"div">) {
  const s = useStyles(cardStyles)

  return (
    <div
      data-slot="card-footer"
      className={cn(s.footer.className, className)}
      style={s.footer.style}
      {...props}
    />
  )
}

export {
  Card,
  CardHeader,
  CardFooter,
  CardTitle,
  CardAction,
  CardDescription,
  CardContent,
}
