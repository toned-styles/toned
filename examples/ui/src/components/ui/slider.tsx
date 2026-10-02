import type { Variants } from '@toned/core'
import { useStyles } from '@toned/react'
import { stylesheet } from '@toned/systems/base'
import { Slider as SliderPrimitive } from 'radix-ui'
import * as React from 'react'

export const sliderStyles = stylesheet({
  root: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
    // No tokens: the pointer drags the thumb instead of scrolling or selecting.
    '@platform web': {
      $style: {
        touchAction: 'none',
        userSelect: 'none',
      },
    },
  },
  track: {
    bgColor: 'interactive_muted',
    position: 'relative',
    overflow: 'hidden',
    borderRadius: 'full',
    flexGrow: '1',
  },
  range: {
    bgColor: 'action',
    position: 'absolute',
  },
  thumb: {
    display: 'block',
    width: '1rem',
    height: '1rem',
    flexShrink: '0',
    bgColor: 'default',
    borderColor: 'action',
    borderWidth: 'medium',
    borderRadius: 'full',
    shadow: 'small',
    cursor: 'grab',
    // No token: the transition list is specific to this control.
    '@platform web': { $style: { transition: 'box-shadow 0.15s' } },
    ':active': { cursor: 'grabbing' },
    ':focus-visible': { shadow: 'focus' },
  },
}).variants(
  (
    $: Variants<{
      orientation: 'horizontal' | 'vertical'
      disabled: boolean
    }>,
  ) => ({
    [$.orientation('horizontal')]: {
      root: { width: '100%', height: '1rem' },
      track: { height: '0.375rem' },
      range: { height: '100%' },
    },
    [$.orientation('vertical')]: {
      root: { flexLayout: 'column', height: '100%', width: '1rem' },
      track: { width: '0.375rem' },
      range: { width: '100%' },
    },
    [$.disabled(true)]: {
      root: { pointerEvents: 'none', opacity: 0.5 },
    },
  }),
  { defaults: { orientation: 'horizontal', disabled: false } },
)

function Slider({
  className,
  defaultValue,
  value,
  min = 0,
  max = 100,
  orientation = 'horizontal',
  disabled,
  ...props
}: React.ComponentProps<typeof SliderPrimitive.Root>) {
  const s = useStyles(sliderStyles, { orientation, disabled: !!disabled })
  const _values = React.useMemo(
    () =>
      Array.isArray(value)
        ? value
        : Array.isArray(defaultValue)
          ? defaultValue
          : [min, max],
    [value, defaultValue, min, max],
  )

  return (
    <SliderPrimitive.Root
      data-slot="slider"
      defaultValue={defaultValue}
      value={value}
      min={min}
      max={max}
      orientation={orientation}
      disabled={disabled}
      {...s.root.with({ className })}
      {...props}
    >
      <SliderPrimitive.Track data-slot="slider-track" {...s.track}>
        <SliderPrimitive.Range data-slot="slider-range" {...s.range} />
      </SliderPrimitive.Track>
      {Array.from({ length: _values.length }, (_, index) => (
        <SliderPrimitive.Thumb
          data-slot="slider-thumb"
          key={index}
          aria-label={
            _values.length > 1
              ? index === 0
                ? 'Minimum'
                : 'Maximum'
              : props['aria-label']
          }
          {...s.thumb}
        />
      ))}
    </SliderPrimitive.Root>
  )
}

export { Slider }
