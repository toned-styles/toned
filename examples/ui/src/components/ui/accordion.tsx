import { useStyles } from '@toned/react'
import { stylesheet } from '@toned/systems/base'
import { ChevronDownIcon } from 'lucide-react'
import { Accordion as AccordionPrimitive } from 'radix-ui'
import type * as React from 'react'

export const accordionStyles = stylesheet({
  root: {
    width: '100%',
  },
  item: {
    borderColor: 'default',
    // No token sets a single edge.
    style: { borderBottomWidth: 1 },
  },
  header: {
    display: 'flex',
  },
  trigger: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 4,
    width: '100%',
    paddingY: 4,
    borderRadius: 'small',
    typo: 'label_small',
    textColor: 'default',
    cursor: 'pointer',
    // No token for text alignment or transitions.
    style: { textAlign: 'left', transition: 'box-shadow 0.15s' },
    ':hover': { textDecoration: 'underline' },
    ':focus-visible': { shadow: 'focus' },
  },
  triggerIcon: {
    textColor: 'muted',
    // The open state rotates the icon from styles.css.
    style: { transition: 'transform 0.2s' },
  },
  content: {
    typo: 'body_small',
    textColor: 'muted',
    overflow: 'hidden',
  },
  contentInner: {
    paddingBottom: 4,
  },
})

function Accordion({
  className,
  ...props
}: React.ComponentProps<typeof AccordionPrimitive.Root>) {
  const s = useStyles(accordionStyles)

  return (
    <AccordionPrimitive.Root
      data-slot="accordion"
      {...s.root.with({ className })}
      {...props}
    />
  )
}

function AccordionItem({
  className,
  ...props
}: React.ComponentProps<typeof AccordionPrimitive.Item>) {
  const s = useStyles(accordionStyles)

  return (
    <AccordionPrimitive.Item
      data-slot="accordion-item"
      {...s.item.with({ className })}
      {...props}
    />
  )
}

function AccordionTrigger({
  className,
  children,
  ...props
}: React.ComponentProps<typeof AccordionPrimitive.Trigger>) {
  const s = useStyles(accordionStyles)

  return (
    <AccordionPrimitive.Header data-slot="accordion-header" {...s.header}>
      <AccordionPrimitive.Trigger
        data-slot="accordion-trigger"
        {...s.trigger.with({ className })}
        {...props}
      >
        {children}
        <ChevronDownIcon {...s.triggerIcon} />
      </AccordionPrimitive.Trigger>
    </AccordionPrimitive.Header>
  )
}

function AccordionContent({
  className,
  children,
  ...props
}: React.ComponentProps<typeof AccordionPrimitive.Content>) {
  const s = useStyles(accordionStyles)

  return (
    <AccordionPrimitive.Content
      data-slot="accordion-content"
      {...s.content}
      {...props}
    >
      <div {...s.contentInner.with({ className })}>{children}</div>
    </AccordionPrimitive.Content>
  )
}

export { Accordion, AccordionItem, AccordionTrigger, AccordionContent }
