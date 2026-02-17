import * as React from "react"
import { Slider as SliderPrimitive } from "radix-ui"
import { useStyles } from "@toned/react"
import { stylesheet } from "@toned/systems/base"

import { cn } from "@/lib/utils"

const sliderStyles = stylesheet({
  root: {
    position: 'relative',
    display: 'flex',
    width: '100%',
    alignItems: 'center',
    style: {
      touchAction: 'none',
      userSelect: 'none',
    },
  },
  track: {
    bgColor: 'muted',
    position: 'relative',
    overflow: 'hidden',
    borderRadius: 'full',
    style: { flexGrow: 1 },
  },
  range: {
    bgColor: 'action',
    position: 'absolute',
  },
  thumb: {
    borderColor: 'action',
    borderWidth: 'thin',
    width: '1rem',
    height: '1rem',
    flexShrink: '0',
    borderRadius: 'full',
    shadow: 'small',
    style: {
      display: 'block',
      backgroundColor: 'white',
      transition: 'color 0.15s, box-shadow 0.15s',
    },
  },
})

function Slider({
  className,
  defaultValue,
  value,
  min = 0,
  max = 100,
  ...props
}: React.ComponentProps<typeof SliderPrimitive.Root>) {
  const s = useStyles(sliderStyles)
  const _values = React.useMemo(
    () =>
      Array.isArray(value)
        ? value
        : Array.isArray(defaultValue)
          ? defaultValue
          : [min, max],
    [value, defaultValue, min, max]
  )

  return (
    <SliderPrimitive.Root
      data-slot="slider"
      defaultValue={defaultValue}
      value={value}
      min={min}
      max={max}
      className={cn(s.root.className, className)}
      style={s.root.style}
      {...props}
    >
      <SliderPrimitive.Track
        data-slot="slider-track"
        className={s.track.className}
        style={s.track.style}
      >
        <SliderPrimitive.Range
          data-slot="slider-range"
          className={s.range.className}
          style={s.range.style}
        />
      </SliderPrimitive.Track>
      {Array.from({ length: _values.length }, (_, index) => (
        <SliderPrimitive.Thumb
          data-slot="slider-thumb"
          key={index}
          className={s.thumb.className}
          style={s.thumb.style}
        />
      ))}
    </SliderPrimitive.Root>
  )
}

export { Slider }
