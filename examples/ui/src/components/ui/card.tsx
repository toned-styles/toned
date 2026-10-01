import type { Variants } from '@toned/core'
import { useStyles } from '@toned/react'
import { stylesheet } from '@toned/systems/base'
import type * as React from 'react'
import { createContext, useContext } from 'react'

export const cardStyles = stylesheet({
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
    display: 'grid',
    alignItems: 'flex-start',
    gap: 1.5,
    paddingX: 6,
    // No token for grid tracks: an action adds a second, content-sized column.
    style: { gridTemplateColumns: 'minmax(0, 1fr)' },
  },
  title: {
    typo: 'heading_4',
    lineHeight: 1.3,
  },
  description: {
    textColor: 'muted',
    typo: 'body_small',
  },
  action: {
    alignSelf: 'flex-start',
    justifySelf: 'flex-end',
    // No token for grid placement: the action spans the title and description.
    style: {
      gridColumnStart: 2,
      gridRowStart: 1,
      gridRowEnd: 'span 2',
    },
  },
  content: {
    paddingX: 6,
    typo: 'body_small',
  },
  footer: {
    display: 'flex',
    alignItems: 'center',
    gap: 2,
    paddingX: 6,
  },
}).variants(
  (
    $: Variants<{
      density: 'comfortable' | 'compact'
      appearance: 'elevated' | 'outline' | 'soft'
    }>,
  ) => ({
    [$.density('compact')]: {
      root: { gap: 4, paddingY: 4 },
      header: { paddingX: 4 },
      content: { paddingX: 4 },
      footer: { paddingX: 4 },
    },
    [$.appearance('outline')]: { root: { bgColor: 'default', shadow: 'none' } },
    [$.appearance('soft')]: {
      root: { bgColor: 'muted', shadow: 'none', borderWidth: 'none' },
    },
  }),
)

type CardOptions = {
  density?: 'comfortable' | 'compact'
  appearance?: 'elevated' | 'outline' | 'soft'
}
const CardContext = createContext<Required<CardOptions>>({
  density: 'comfortable',
  appearance: 'elevated',
})
function useCardStyles() {
  return useStyles(cardStyles, useContext(CardContext))
}

function Card({
  className,
  style,
  density = 'comfortable',
  appearance = 'elevated',
  ...props
}: React.ComponentProps<'div'> & CardOptions) {
  const s = useStyles(cardStyles, { density, appearance })
  return (
    <CardContext.Provider value={{ density, appearance }}>
      <div
        data-slot="card"
        data-density={density}
        data-appearance={appearance}
        {...s.root.with({ className, style })}
        {...props}
      />
    </CardContext.Provider>
  )
}

function CardHeader({
  className,
  style,
  ...props
}: React.ComponentProps<'div'>) {
  const s = useCardStyles()

  return (
    <div
      data-slot="card-header"
      {...s.header.with({ className, style })}
      {...props}
    />
  )
}

function CardTitle({
  className,
  style,
  ...props
}: React.ComponentProps<'div'>) {
  const s = useCardStyles()

  return (
    <div
      data-slot="card-title"
      {...s.title.with({ className, style })}
      {...props}
    />
  )
}

function CardDescription({
  className,
  style,
  ...props
}: React.ComponentProps<'div'>) {
  const s = useCardStyles()

  return (
    <div
      data-slot="card-description"
      {...s.description.with({ className, style })}
      {...props}
    />
  )
}

function CardAction({
  className,
  style,
  ...props
}: React.ComponentProps<'div'>) {
  const s = useCardStyles()

  return (
    <div
      data-slot="card-action"
      {...s.action.with({ className, style })}
      {...props}
    />
  )
}

function CardContent({
  className,
  style,
  ...props
}: React.ComponentProps<'div'>) {
  const s = useCardStyles()

  return (
    <div
      data-slot="card-content"
      {...s.content.with({ className, style })}
      {...props}
    />
  )
}

function CardFooter({
  className,
  style,
  ...props
}: React.ComponentProps<'div'>) {
  const s = useCardStyles()

  return (
    <div
      data-slot="card-footer"
      {...s.footer.with({ className, style })}
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
