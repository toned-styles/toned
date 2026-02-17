import * as React from "react"
import { useStyles } from "@toned/react"
import { stylesheet } from "@toned/systems/base"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"

const inputGroupStyles = stylesheet({
  root: {
    borderColor: 'default',
    borderWidth: 'thin',
    borderRadius: 'medium',
    shadow: 'small',
    display: 'flex',
    alignItems: 'center',
    position: 'relative',
    style: {
      width: '100%',
      height: '2.25rem',
      minWidth: 0,
      outline: 'none',
      transition: 'color 0.15s, box-shadow 0.15s',
    },
  },
  addon: {
    textColor: 'muted',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    typo: 'body_small',
    fontWeight: 500,
    style: {
      height: 'auto',
      cursor: 'text',
      paddingTop: '0.375rem',
      paddingBottom: '0.375rem',
      userSelect: 'none',
    },
  },
  addonInlineStart: {
    paddingX: 3,
    style: {
      order: -1,
    },
  },
  addonInlineEnd: {
    paddingX: 3,
    style: {
      order: 999,
    },
  },
  addonBlockStart: {
    paddingX: 3,
    style: {
      order: -1,
      width: '100%',
      justifyContent: 'flex-start',
      paddingTop: '0.75rem',
    },
  },
  addonBlockEnd: {
    paddingX: 3,
    style: {
      order: 999,
      width: '100%',
      justifyContent: 'flex-start',
      paddingBottom: '0.75rem',
    },
  },
  text: {
    textColor: 'muted',
    display: 'flex',
    alignItems: 'center',
    gap: 2,
    typo: 'body_small',
  },
})

function InputGroup({ className, ...props }: React.ComponentProps<"div">) {
  const s = useStyles(inputGroupStyles)

  return (
    <div
      data-slot="input-group"
      role="group"
      className={cn(s.root.className, className)}
      style={s.root.style}
      {...props}
    />
  )
}

function InputGroupAddon({
  className,
  align = "inline-start",
  ...props
}: React.ComponentProps<"div"> & {
  align?: "inline-start" | "inline-end" | "block-start" | "block-end"
}) {
  const s = useStyles(inputGroupStyles)

  const alignStyles = align === 'inline-end' ? s.addonInlineEnd
    : align === 'block-start' ? s.addonBlockStart
    : align === 'block-end' ? s.addonBlockEnd
    : s.addonInlineStart

  return (
    <div
      role="group"
      data-slot="input-group-addon"
      data-align={align}
      className={cn(s.addon.className, alignStyles.className, className)}
      style={{ ...s.addon.style, ...alignStyles.style }}
      onClick={(e) => {
        if ((e.target as HTMLElement).closest("button")) {
          return
        }
        e.currentTarget.parentElement?.querySelector("input")?.focus()
      }}
      {...props}
    />
  )
}

function InputGroupButton({
  className,
  type = "button",
  variant = "ghost",
  size = "xs",
  ...props
}: React.ComponentProps<typeof Button>) {
  return (
    <Button
      type={type}
      data-size={size}
      variant={variant}
      size={size}
      className={cn(className)}
      style={{ boxShadow: 'none' }}
      {...props}
    />
  )
}

function InputGroupText({ className, ...props }: React.ComponentProps<"span">) {
  const s = useStyles(inputGroupStyles)

  return (
    <span
      className={cn(s.text.className, className)}
      style={s.text.style}
      {...props}
    />
  )
}

function InputGroupInput({
  className,
  ...props
}: React.ComponentProps<"input">) {
  return (
    <Input
      data-slot="input-group-control"
      className={cn(className)}
      style={{ flex: 1, borderRadius: 0, border: 0, background: 'transparent', boxShadow: 'none' }}
      {...props}
    />
  )
}

function InputGroupTextarea({
  className,
  ...props
}: React.ComponentProps<"textarea">) {
  return (
    <Textarea
      data-slot="input-group-control"
      className={cn(className)}
      style={{ flex: 1, resize: 'none', borderRadius: 0, border: 0, background: 'transparent', padding: '0.75rem', boxShadow: 'none' }}
      {...props}
    />
  )
}

export {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupText,
  InputGroupInput,
  InputGroupTextarea,
}
