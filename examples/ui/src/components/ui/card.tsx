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
    style: { borderStyle: 'solid' },
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
        {...s.root.with({ className })}
        {...props}
      />
    </CardContext.Provider>
  )
}

function CardHeader({ className, ...props }: React.ComponentProps<'div'>) {
  const s = useCardStyles()

  return (
    <div data-slot="card-header" {...s.header.with({ className })} {...props} />
  )
}

function CardTitle({ className, ...props }: React.ComponentProps<'div'>) {
  const s = useCardStyles()

  return (
    <div data-slot="card-title" {...s.title.with({ className })} {...props} />
  )
}

function CardDescription({ className, ...props }: React.ComponentProps<'div'>) {
  const s = useCardStyles()

  return (
    <div
      data-slot="card-description"
      {...s.description.with({ className })}
      {...props}
    />
  )
}

function CardAction({ className, ...props }: React.ComponentProps<'div'>) {
  const s = useCardStyles()

  return (
    <div data-slot="card-action" {...s.action.with({ className })} {...props} />
  )
}

function CardContent({ className, ...props }: React.ComponentProps<'div'>) {
  const s = useCardStyles()

  return (
    <div
      data-slot="card-content"
      {...s.content.with({ className })}
      {...props}
    />
  )
}

function CardFooter({ className, ...props }: React.ComponentProps<'div'>) {
  const s = useCardStyles()

  return (
    <div data-slot="card-footer" {...s.footer.with({ className })} {...props} />
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
