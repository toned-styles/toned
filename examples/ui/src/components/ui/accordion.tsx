import * as React from "react"
import { ChevronDownIcon } from "lucide-react"
import { Accordion as AccordionPrimitive } from "radix-ui"
import { useStyles } from "@toned/react"
import { stylesheet } from "@toned/systems/base"


const accordionStyles = stylesheet({
  item: {
    borderColor: 'default',
    style: {
      borderBottomWidth: '1px',
    },
  },
  trigger: {
    display: 'flex',
    alignItems: 'flex-start',
    borderRadius: 'medium',
    typo: 'body_small',
    fontWeight: 500,
    cursor: 'pointer',
    style: {
      flex: 1,
      justifyContent: 'space-between',
      gap: '1rem',
      padding: '1rem 0',
      textAlign: 'left',
      transition: 'all 0.15s',
      outline: 'none',
      background: 'none',
      border: 'none',
    },
  },
  triggerIcon: {
    textColor: 'muted',
    pointerEvents: 'none',
    style: {
      width: '1rem',
      height: '1rem',
      flexShrink: 0,
      transform: 'translateY(2px)',
      transition: 'transform 0.2s',
    },
  },
  content: {
    typo: 'body_small',
    overflow: 'hidden',
  },
  contentInner: {
    style: {
      paddingTop: 0,
      paddingBottom: '1rem',
    },
  },
})

function Accordion({
  ...props
}: React.ComponentProps<typeof AccordionPrimitive.Root>) {
  return <AccordionPrimitive.Root data-slot="accordion" {...props} />
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
    <AccordionPrimitive.Header className="flex">
      <AccordionPrimitive.Trigger
        data-slot="accordion-trigger"
        {...s.trigger.with({ className })}
        {...props}
      >
        {children}
        <ChevronDownIcon
          {...s.triggerIcon}
        />
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
      <div
        {...s.contentInner.with({ className })}
      >
        {children}
      </div>
    </AccordionPrimitive.Content>
  )
}

export { Accordion, AccordionItem, AccordionTrigger, AccordionContent }
