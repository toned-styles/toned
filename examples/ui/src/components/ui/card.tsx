import * as React from "react"
import { useStyles } from "@toned/react"
import { stylesheet } from "@toned/systems/base"

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
    alignItems: 'flex-start',
    style: {
      display: 'grid',
      gridAutoRows: 'min-content',
      gridTemplateRows: 'auto auto',
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
    alignSelf: 'flex-start',
    justifySelf: 'flex-end',
    style: {
      gridColumnStart: 2,
      gridRowStart: 1,
      gridRowEnd: 'span 2',
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
      {...s.root.with({ className })}
      {...props}
    />
  )
}

function CardHeader({ className, ...props }: React.ComponentProps<"div">) {
  const s = useStyles(cardStyles)

  return (
    <div
      data-slot="card-header"
      {...s.header.with({ className })}
      {...props}
    />
  )
}

function CardTitle({ className, ...props }: React.ComponentProps<"div">) {
  const s = useStyles(cardStyles)

  return (
    <div
      data-slot="card-title"
      {...s.title.with({ className })}
      {...props}
    />
  )
}

function CardDescription({ className, ...props }: React.ComponentProps<"div">) {
  const s = useStyles(cardStyles)

  return (
    <div
      data-slot="card-description"
      {...s.description.with({ className })}
      {...props}
    />
  )
}

function CardAction({ className, ...props }: React.ComponentProps<"div">) {
  const s = useStyles(cardStyles)

  return (
    <div
      data-slot="card-action"
      {...s.action.with({ className })}
      {...props}
    />
  )
}

function CardContent({ className, ...props }: React.ComponentProps<"div">) {
  const s = useStyles(cardStyles)

  return (
    <div
      data-slot="card-content"
      {...s.content.with({ className })}
      {...props}
    />
  )
}

function CardFooter({ className, ...props }: React.ComponentProps<"div">) {
  const s = useStyles(cardStyles)

  return (
    <div
      data-slot="card-footer"
      {...s.footer.with({ className })}
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
