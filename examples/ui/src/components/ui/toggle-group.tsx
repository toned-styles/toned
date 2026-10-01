'use client'

import { useStyles } from '@toned/react'
import { stylesheet } from '@toned/systems/base'
import { ToggleGroup as ToggleGroupPrimitive } from 'radix-ui'
import * as React from 'react'

import { toggleStyles } from '@/components/ui/toggle.tsx'

export const toggleGroupStyles = stylesheet({
  root: {
    display: 'flex',
    alignItems: 'center',
    borderRadius: 'medium',
    width: 'fit-content',
  },
})

type ToggleOptions = {
  variant?: 'default' | 'outline'
  size?: 'default' | 'sm' | 'lg'
}

const ToggleGroupContext = React.createContext<
  ToggleOptions & { pressed: readonly string[] }
>({ pressed: [] })

const toList = (value: string | string[] | undefined) =>
  value === undefined || value === '' ? [] : [value].flat()

function ToggleGroup({
  className,
  variant = 'default',
  size = 'default',
  spacing = 0,
  children,
  ...props
}: React.ComponentProps<typeof ToggleGroupPrimitive.Root> &
  ToggleOptions & {
    /** Gap between items, in spacing steps. Items join when it is 0. */
    spacing?: number
  }) {
  const s = useStyles(toggleGroupStyles)
  // The pressed look is a stylesheet variant, so the group mirrors its value.
  const [internal, setInternal] = React.useState(() =>
    toList(props.defaultValue),
  )
  const pressed = props.value === undefined ? internal : toList(props.value)
  const context = React.useMemo(
    () => ({ variant, size, pressed }),
    [variant, size, pressed],
  )
  const shared = {
    'data-slot': 'toggle-group',
    'data-variant': variant,
    'data-size': size,
    'data-joined': spacing === 0 ? '' : undefined,
    ...s.root.with({
      className,
      style: spacing ? { gap: `calc(${spacing} * var(--base))` } : undefined,
    }),
  }
  const content = (
    <ToggleGroupContext.Provider value={context}>
      {children}
    </ToggleGroupContext.Provider>
  )

  // Radix types `single` and `multiple` as separate prop sets.
  if (props.type === 'multiple') {
    const { onValueChange, ...rest } = props
    return (
      <ToggleGroupPrimitive.Root
        {...shared}
        {...rest}
        onValueChange={(value: string[]) => {
          setInternal(value)
          onValueChange?.(value)
        }}
      >
        {content}
      </ToggleGroupPrimitive.Root>
    )
  }
  const { onValueChange, ...rest } = props
  return (
    <ToggleGroupPrimitive.Root
      {...shared}
      {...rest}
      onValueChange={(value: string) => {
        setInternal(toList(value))
        onValueChange?.(value)
      }}
    >
      {content}
    </ToggleGroupPrimitive.Root>
  )
}

function ToggleGroupItem({
  className,
  children,
  disabled,
  variant,
  size,
  value,
  ...props
}: React.ComponentProps<typeof ToggleGroupPrimitive.Item> & ToggleOptions) {
  const context = React.useContext(ToggleGroupContext)
  const resolvedVariant = context.variant ?? variant ?? 'default'
  const resolvedSize = context.size ?? size ?? 'default'
  const s = useStyles(toggleStyles, {
    variant: resolvedVariant,
    size: resolvedSize,
    pressed: context.pressed.includes(value),
    disabled: !!disabled,
  })

  return (
    <ToggleGroupPrimitive.Item
      data-slot="toggle-group-item"
      data-variant={resolvedVariant}
      data-size={resolvedSize}
      value={value}
      {...s.root.with({ className })}
      disabled={disabled}
      {...props}
    >
      {children}
    </ToggleGroupPrimitive.Item>
  )
}

export { ToggleGroup, ToggleGroupItem }
