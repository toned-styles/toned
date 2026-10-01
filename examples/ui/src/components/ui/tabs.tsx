import type { Variants } from '@toned/core'
import { useStyles } from '@toned/react'
import { stylesheet } from '@toned/systems/base'
import { Tabs as TabsPrimitive } from 'radix-ui'
import type * as React from 'react'
import { createContext, useContext } from 'react'

// The active trigger is keyed on Radix's `data-state` in styles.css.
export const tabsStyles = stylesheet({
  root: {
    display: 'flex',
    gap: 3,
  },
  list: {
    display: 'inline-flex',
    alignItems: 'center',
    width: 'fit-content',
    maxWidth: '100%',
    textColor: 'muted',
  },
  trigger: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 1.5,
    flexShrink: '0',
    typo: 'label_small',
    cursor: 'pointer',
    // No tokens for text wrapping or transitions.
    style: {
      whiteSpace: 'nowrap',
      transition: 'color 0.15s, background-color 0.15s, box-shadow 0.15s',
    },
    ':hover': { textColor: 'default' },
    ':focus-visible': { shadow: 'focus' },
  },
  content: {
    flexGrow: '1',
    borderRadius: 'medium',
    typo: 'body_small',
    ':focus-visible': { shadow: 'focus' },
  },
}).variants(
  (
    $: Variants<{
      orientation: 'horizontal' | 'vertical'
      variant: 'default' | 'line'
      disabled: boolean
    }>,
  ) => ({
    [$.orientation('horizontal')]: {
      root: { flexLayout: 'column' },
    },
    [$.variant('default')]: {
      list: { gap: 0.5, padding: 1, bgColor: 'muted', borderRadius: 'large' },
      trigger: { height: '1.75rem', paddingX: 3, borderRadius: 'medium' },
    },
    [$.variant('line')]: {
      list: {
        gap: 4,
        borderColor: 'default',
        // No token sets a single edge.
        style: { borderBottomWidth: 1 },
      },
      trigger: { height: '2.25rem', paddingX: 0.5 },
    },
    [$.disabled(true)]: {
      trigger: { pointerEvents: 'none', opacity: 0.5 },
    },
  }),
  {
    defaults: {
      orientation: 'horizontal',
      variant: 'default',
      disabled: false,
    },
  },
)

type TabsVariant = 'default' | 'line'
// A list sets the look of its triggers, so the variant travels by context.
const TabsListContext = createContext<TabsVariant>('default')

function Tabs({
  className,
  orientation = 'horizontal',
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Root>) {
  const s = useStyles(tabsStyles, { orientation })

  return (
    <TabsPrimitive.Root
      data-slot="tabs"
      orientation={orientation}
      {...s.root.with({ className })}
      {...props}
    />
  )
}

function TabsList({
  className,
  variant = 'default',
  ...props
}: React.ComponentProps<typeof TabsPrimitive.List> & {
  variant?: TabsVariant
}) {
  const s = useStyles(tabsStyles, { variant })

  return (
    <TabsListContext.Provider value={variant}>
      <TabsPrimitive.List
        data-slot="tabs-list"
        data-variant={variant}
        {...s.list.with({ className })}
        {...props}
      />
    </TabsListContext.Provider>
  )
}

function TabsTrigger({
  className,
  disabled,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Trigger>) {
  const variant = useContext(TabsListContext)
  const s = useStyles(tabsStyles, { variant, disabled: !!disabled })

  return (
    <TabsPrimitive.Trigger
      data-slot="tabs-trigger"
      data-variant={variant}
      disabled={disabled}
      {...s.trigger.with({ className })}
      {...props}
    />
  )
}

function TabsContent({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Content>) {
  const s = useStyles(tabsStyles)

  return (
    <TabsPrimitive.Content
      data-slot="tabs-content"
      {...s.content.with({ className })}
      {...props}
    />
  )
}

export { Tabs, TabsList, TabsTrigger, TabsContent }
