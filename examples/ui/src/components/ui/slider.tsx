import * as React from "react"
import { Slider as SliderPrimitive } from "radix-ui"
import { useStyles } from "@toned/react"
import { stylesheet } from "@toned/systems/base"

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
    flexGrow: '1',
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
    display: 'block',
    style: {
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
      {...s.root.with({ className })}
      {...props}
    >
      <SliderPrimitive.Track
        data-slot="slider-track"
        {...s.track}
      >
        <SliderPrimitive.Range
          data-slot="slider-range"
          {...s.range}
        />
      </SliderPrimitive.Track>
      {Array.from({ length: _values.length }, (_, index) => (
        <SliderPrimitive.Thumb
          data-slot="slider-thumb"
          key={index}
          {...s.thumb}
        />
      ))}
    </SliderPrimitive.Root>
  )
}

export { Slider }
