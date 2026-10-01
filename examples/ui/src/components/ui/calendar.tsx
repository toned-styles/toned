import type { Variants } from '@toned/core'
import { useStyles } from '@toned/react'
import { stylesheet } from '@toned/systems/base'
import { ChevronLeftIcon, ChevronRightIcon } from 'lucide-react'
import * as React from 'react'
import { type DayButton, DayPicker } from 'react-day-picker'

export const calendarStyles = stylesheet({
  root: {
    bgColor: 'elevated',
    textColor: 'default',
    width: 'fit-content',
    padding: 3,
    borderColor: 'default',
    borderWidth: 'thin',
    borderRadius: 'large',
  },
  months: {
    position: 'relative',
    display: 'flex',
    flexWrap: 'wrap',
    gap: 4,
  },
  month: {
    flexLayout: 'column',
    gap: 2,
  },
  nav: {
    position: 'absolute',
    top: 0,
    right: 0,
    display: 'flex',
    gap: 1,
  },
  navButton: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '1.75rem',
    height: '1.75rem',
    borderRadius: 'medium',
    textColor: 'muted',
    cursor: 'pointer',
    // No token: the transition list is specific to this part.
    style: { transition: 'background-color 0.15s, box-shadow 0.15s' },
    ':hover': { bgColor: 'subtle', textColor: 'default' },
    ':focus-visible': { shadow: 'focus' },
  },
  caption: {
    display: 'flex',
    alignItems: 'center',
    height: '1.75rem',
    paddingX: 2,
  },
  captionLabel: {
    typo: 'label_small',
  },
  grid: {
    // No token for table layout.
    style: { borderCollapse: 'collapse' },
  },
  weekday: {
    width: '2.25rem',
    height: '2rem',
    typo: 'caption',
    textColor: 'muted',
    fontWeight: 500,
  },
  day: {
    padding: 0,
    // No token for text alignment.
    style: { textAlign: 'center' },
  },
  dayButton: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '2.25rem',
    height: '2.25rem',
    borderRadius: 'medium',
    typo: 'body_small',
    cursor: 'pointer',
    // No token: the transition list is specific to this part.
    style: { transition: 'background-color 0.15s, box-shadow 0.15s' },
    ':hover': { bgColor: 'subtle' },
    ':focus-visible': { shadow: 'focus' },
  },
}).variants(
  (
    $: Variants<{
      today: boolean
      outside: boolean
      selected: boolean
      inRange: boolean
      disabled: boolean
    }>,
  ) => ({
    [$.today(true)]: {
      dayButton: { textColor: 'action', fontWeight: 700 },
    },
    [$.outside(true)]: {
      dayButton: { textColor: 'muted', opacity: 0.6 },
    },
    [$.inRange(true)]: {
      dayButton: {
        bgColor: 'action_secondary',
        textColor: 'on_action_secondary',
        borderRadius: 'none',
      },
    },
    [$.selected(true)]: {
      dayButton: {
        bgColor: 'action',
        textColor: 'on_action',
        opacity: 1,
        ':hover': { bgColor: 'action' },
      },
    },
    [$.disabled(true)]: {
      dayButton: { pointerEvents: 'none', opacity: 0.4 },
    },
  }),
  {
    defaults: {
      today: false,
      outside: false,
      selected: false,
      inRange: false,
      disabled: false,
    },
  },
)

function Calendar({
  className,
  classNames,
  styles,
  showOutsideDays = true,
  components,
  ...props
}: React.ComponentProps<typeof DayPicker>) {
  const s = useStyles(calendarStyles)
  // DayPicker takes class names and style objects per part, not components,
  // so each part's resolved bag is read into its two maps.
  const parts = {
    root: s.root,
    months: s.months,
    month: s.month,
    nav: s.nav,
    month_caption: s.caption,
    caption_label: s.captionLabel,
    month_grid: s.grid,
    weekday: s.weekday,
    day: s.day,
  }
  const names = Object.keys(parts) as (keyof typeof parts)[]

  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={className}
      classNames={{
        ...Object.fromEntries(
          names.map((name) => [name, parts[name].className]),
        ),
        ...classNames,
      }}
      styles={{
        ...Object.fromEntries(names.map((name) => [name, parts[name].style])),
        ...styles,
      }}
      components={{
        Root: ({ rootRef, ...rootProps }) => (
          <div data-slot="calendar" ref={rootRef} {...rootProps} />
        ),
        PreviousMonthButton: (buttonProps) => (
          <CalendarNavButton {...buttonProps} />
        ),
        NextMonthButton: (buttonProps) => (
          <CalendarNavButton {...buttonProps} />
        ),
        Chevron: ({ orientation }) =>
          orientation === 'left' ? <ChevronLeftIcon /> : <ChevronRightIcon />,
        DayButton: CalendarDayButton,
        ...components,
      }}
      {...props}
    />
  )
}

function CalendarNavButton({
  className,
  ...props
}: React.ComponentProps<'button'>) {
  const s = useStyles(calendarStyles)

  return (
    <button
      type="button"
      data-slot="calendar-nav-button"
      {...s.navButton.with({ className })}
      {...props}
    />
  )
}

function CalendarDayButton({
  className,
  day,
  modifiers,
  ...props
}: React.ComponentProps<typeof DayButton>) {
  const s = useStyles(calendarStyles, {
    today: !!modifiers.today,
    outside: !!modifiers.outside,
    inRange: !!modifiers.range_middle,
    selected: !!modifiers.selected && !modifiers.range_middle,
    disabled: !!modifiers.disabled,
  })

  const ref = React.useRef<HTMLButtonElement>(null)
  React.useEffect(() => {
    if (modifiers.focused) ref.current?.focus()
  }, [modifiers.focused])

  return (
    <button
      type="button"
      data-slot="calendar-day"
      data-day={day.isoDate}
      {...s.dayButton.with({ ref, className })}
      {...props}
    />
  )
}

export { Calendar, CalendarDayButton }
