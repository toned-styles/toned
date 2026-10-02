import { createElements } from '@toned/react'
import {
  type ButtonHTMLAttributes,
  type CSSProperties,
  type KeyboardEvent,
  type ReactNode,
  useId,
  useRef,
} from 'react'

import { buttonStyles } from '../../styles/themes/sheets/button.ts'
import {
  avatarStyles,
  badgeStyles,
  chartStyles,
  meterStyles,
} from '../../styles/themes/sheets/content.ts'
import {
  checkStyles,
  fieldStyles,
  segmentStyles,
  sliderStyles,
  switchStyles,
  tabStyles,
} from '../../styles/themes/sheets/controls.ts'
import { sliderValue } from '../../styles/themes/vars.ts'

// One family per stylesheet, created once. Each names its parts as components.
const ButtonParts = createElements(buttonStyles)
const Badges = createElements(badgeStyles)
const Avatars = createElements(avatarStyles)
const Meters = createElements(meterStyles)
const Charts = createElements(chartStyles)
const Fields = createElements(fieldStyles)
const Checks = createElements(checkStyles)
const Switches = createElements(switchStyles)
const Segments = createElements(segmentStyles)
const Sliders = createElements(sliderStyles)
const TabParts = createElements(tabStyles)

export function Button({
  tone,
  shape,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  tone?: 'primary' | 'secondary' | 'danger' | 'quiet'
  shape?: 'label' | 'icon'
}) {
  return (
    <ButtonParts tone={tone} shape={shape} disabled={props.disabled ?? false}>
      <ButtonParts.Root as="button" type="button" {...props} />
    </ButtonParts>
  )
}

export function Badge({
  tone,
  children,
}: {
  tone?: 'ok' | 'warn' | 'bad' | 'neutral'
  children: ReactNode
}) {
  return (
    <Badges tone={tone}>
      <Badges.Root as="span">{children}</Badges.Root>
    </Badges>
  )
}

export function Avatar({ name, stacked }: { name: string; stacked?: boolean }) {
  return (
    <Avatars stacked={stacked ?? false}>
      <Avatars.Root as="span" aria-hidden="true">
        {name}
      </Avatars.Root>
    </Avatars>
  )
}

export function AvatarGroup({
  names,
  label,
}: {
  names: string[]
  label: string
}) {
  return (
    <Avatars.Group role="img" aria-label={label}>
      {names.map((name, index) => (
        <Avatar key={name} name={name} stacked={index > 0} />
      ))}
    </Avatars.Group>
  )
}

export function Meter({ value, label }: { value: number; label: string }) {
  return (
    <Meters.Track
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={value}
    >
      {/* The width is the measurement itself, not a design value. */}
      <Meters.Bar style={{ width: `${value}%` }} />
    </Meters.Track>
  )
}

/**
 * A bar chart of a short series. `size="spark"` draws it small, beside a
 * figure, where it is decoration: the figure carries the meaning.
 */
export function Bars({
  values,
  size,
  label,
}: {
  values: readonly number[]
  size?: 'full' | 'spark'
  label?: string
}) {
  const max = Math.max(...values)
  return (
    <Charts size={size}>
      <Charts.Root
        role={label ? 'img' : undefined}
        aria-label={label}
        aria-hidden={label ? undefined : true}
      >
        {values.map((value, index) => (
          <Charts key={index} newest={index === values.length - 1}>
            {/* The height is the measurement itself, not a design value. */}
            <Charts.Bar style={{ height: `${(value / max) * 100}%` }} />
          </Charts>
        ))}
      </Charts.Root>
    </Charts>
  )
}

export const ChartAxis = Charts.Axis

export const FieldGrid = Fields.Grid

export function TextField({
  label,
  hint,
  value,
  onChange,
  required,
}: {
  label: string
  hint?: string
  value: string
  onChange: (value: string) => void
  required?: boolean
}) {
  const id = useId()
  return (
    <Fields.Root>
      <Fields.Label as="label" htmlFor={id}>
        {label}
      </Fields.Label>
      <Fields.Input
        as="input"
        id={id}
        type="text"
        value={value}
        required={required}
        aria-describedby={hint ? `${id}-hint` : undefined}
        onChange={(event) => onChange(event.currentTarget.value)}
      />
      {hint && (
        <Fields.Hint as="span" id={`${id}-hint`}>
          {hint}
        </Fields.Hint>
      )}
    </Fields.Root>
  )
}

export function SelectField({
  label,
  value,
  options,
  onChange,
}: {
  label: string
  value: string
  options: readonly string[]
  onChange: (value: string) => void
}) {
  const id = useId()
  return (
    <Fields.Root>
      <Fields.Label as="label" htmlFor={id}>
        {label}
      </Fields.Label>
      <Fields.Control>
        <Fields.Input
          as="select"
          id={id}
          value={value}
          onChange={(event) => onChange(event.currentTarget.value)}
        >
          {options.map((option) => (
            <option key={option}>{option}</option>
          ))}
        </Fields.Input>
        <Fields.Chevron as="span" aria-hidden="true">
          <svg
            width="12"
            height="12"
            viewBox="0 0 12 12"
            fill="none"
            aria-hidden="true"
          >
            <path d="M2 4l4 4 4-4" stroke="currentColor" strokeWidth="2" />
          </svg>
        </Fields.Chevron>
      </Fields.Control>
    </Fields.Root>
  )
}

export function Checkbox({
  checked,
  onChange,
  children,
}: {
  checked: boolean
  onChange: (checked: boolean) => void
  children: ReactNode
}) {
  return (
    <Checks checked={checked}>
      <Checks.Root
        as="button"
        type="button"
        role="checkbox"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
      >
        <Checks.Box as="span">
          <Checks.Mark as="span" aria-hidden="true">
            <svg
              width="12"
              height="12"
              viewBox="0 0 12 12"
              fill="none"
              aria-hidden="true"
            >
              <path
                d="M2 6.5l2.5 2.5L10 3.5"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="square"
              />
            </svg>
          </Checks.Mark>
        </Checks.Box>
        {children}
      </Checks.Root>
    </Checks>
  )
}

export function Switch({
  on,
  onChange,
  children,
}: {
  on: boolean
  onChange: (on: boolean) => void
  children: ReactNode
}) {
  return (
    <Switches on={on}>
      <Switches.Root
        as="button"
        type="button"
        role="switch"
        aria-checked={on}
        onClick={() => onChange(!on)}
      >
        <Switches.Track as="span">
          <Switches.Thumb as="span" />
        </Switches.Track>
        {children}
      </Switches.Root>
    </Switches>
  )
}

/**
 * Arrow keys move between the options of a tab list or radio group and select
 * as they go; only the selected option is in the tab order.
 */
export function useRoving<Value extends string>(
  values: readonly Value[],
  value: Value,
  onChange: (value: Value) => void,
) {
  const nodes = useRef(new Map<Value, HTMLElement>())
  return (option: Value) => ({
    tabIndex: option === value ? 0 : -1,
    ref: (node: HTMLElement | null) => {
      if (node) nodes.current.set(option, node)
      else nodes.current.delete(option)
    },
    onKeyDown: (event: KeyboardEvent) => {
      const index = values.indexOf(option)
      const next =
        event.key === 'ArrowRight' || event.key === 'ArrowDown'
          ? values[(index + 1) % values.length]
          : event.key === 'ArrowLeft' || event.key === 'ArrowUp'
            ? values[(index - 1 + values.length) % values.length]
            : event.key === 'Home'
              ? values[0]
              : event.key === 'End'
                ? values[values.length - 1]
                : undefined
      if (next === undefined) return
      event.preventDefault()
      onChange(next)
      nodes.current.get(next)?.focus()
    },
  })
}

export function Segmented<Value extends string>({
  label,
  options,
  value,
  onChange,
}: {
  label: string
  options: readonly Value[]
  value: Value
  onChange: (value: Value) => void
}) {
  const roving = useRoving(options, value, onChange)
  const id = useId()
  return (
    <Fields.Root>
      <Fields.Label as="span" id={id}>
        {label}
      </Fields.Label>
      <Segments.Root role="radiogroup" aria-labelledby={id}>
        {options.map((option) => (
          <Segments key={option} selected={option === value}>
            <Segments.Option
              as="button"
              type="button"
              role="radio"
              aria-checked={option === value}
              onClick={() => onChange(option)}
              {...roving(option)}
            >
              {option}
            </Segments.Option>
          </Segments>
        ))}
      </Segments.Root>
    </Fields.Root>
  )
}

export function Slider({
  label,
  value,
  onChange,
}: {
  label: string
  value: number
  onChange: (value: number) => void
}) {
  const id = useId()
  return (
    <Fields.Root>
      <Fields.Label as="label" htmlFor={id}>
        {label}
      </Fields.Label>
      <Sliders.Row>
        <Sliders.Input
          as="input"
          id={id}
          type="range"
          min={0}
          max={100}
          step={5}
          value={value}
          // The filled part of the track follows the value: it is data.
          style={{ [sliderValue.onElement]: `${value}%` } as CSSProperties}
          onChange={(event) => onChange(Number(event.currentTarget.value))}
        />
        <Sliders.Value as="output" htmlFor={id}>
          {value}%
        </Sliders.Value>
      </Sliders.Row>
    </Fields.Root>
  )
}

export function Tabs<Value extends string>({
  label,
  tabs,
  value,
  onChange,
  children,
}: {
  label: string
  tabs: readonly { id: Value; label: string }[]
  value: Value
  onChange: (value: Value) => void
  children: ReactNode
}) {
  const id = useId()
  const roving = useRoving(
    tabs.map((tab) => tab.id),
    value,
    onChange,
  )
  return (
    <>
      <TabParts.List role="tablist" aria-label={label}>
        {tabs.map((tab) => (
          <TabParts key={tab.id} selected={tab.id === value}>
            <TabParts.Tab
              as="button"
              type="button"
              role="tab"
              id={`${id}-${tab.id}`}
              aria-selected={tab.id === value}
              aria-controls={`${id}-panel`}
              onClick={() => onChange(tab.id)}
              {...roving(tab.id)}
            >
              {tab.label}
            </TabParts.Tab>
          </TabParts>
        ))}
      </TabParts.List>
      <TabParts.Panel
        role="tabpanel"
        id={`${id}-panel`}
        aria-labelledby={`${id}-${value}`}
        tabIndex={0}
      >
        {children}
      </TabParts.Panel>
    </>
  )
}
