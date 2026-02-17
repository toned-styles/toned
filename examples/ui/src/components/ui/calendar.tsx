import * as React from "react"
import {
  ChevronDownIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
} from "lucide-react"
import {
  DayPicker,
  getDefaultClassNames,
  type DayButton,
} from "react-day-picker"
import { useStyles } from "@toned/react"
import { stylesheet } from "@toned/systems/base"

import { cn } from "@/lib/utils"
import { Button, buttonStyles } from "@/components/ui/button"

const calendarStyles = stylesheet({
  root: {
    bgColor: 'default',
    padding: 3,
  },
})

function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  captionLayout = "label",
  buttonVariant = "ghost",
  formatters,
  components,
  ...props
}: React.ComponentProps<typeof DayPicker> & {
  buttonVariant?: React.ComponentProps<typeof Button>["variant"]
}) {
  const defaultClassNames = getDefaultClassNames()
  const s = useStyles(calendarStyles)
  const btnS = useStyles(buttonStyles, { variant: buttonVariant, size: 'icon' })

  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn("group/calendar", s.root.className, className)}
      style={s.root.style}
      captionLayout={captionLayout}
      formatters={{
        formatMonthDropdown: (date) =>
          date.toLocaleString("default", { month: "short" }),
        ...formatters,
      }}
      classNames={{
        root: cn(defaultClassNames.root),
        months: cn(defaultClassNames.months),
        month: cn(defaultClassNames.month),
        nav: cn(defaultClassNames.nav),
        button_previous: cn(btnS.root.className, defaultClassNames.button_previous),
        button_next: cn(btnS.root.className, defaultClassNames.button_next),
        month_caption: cn(defaultClassNames.month_caption),
        dropdowns: cn(defaultClassNames.dropdowns),
        dropdown_root: cn(defaultClassNames.dropdown_root),
        dropdown: cn(defaultClassNames.dropdown),
        caption_label: cn(defaultClassNames.caption_label),
        table: "w-full",
        weekdays: cn(defaultClassNames.weekdays),
        weekday: cn(defaultClassNames.weekday),
        week: cn(defaultClassNames.week),
        week_number_header: cn(defaultClassNames.week_number_header),
        week_number: cn(defaultClassNames.week_number),
        day: cn(defaultClassNames.day),
        range_start: cn(defaultClassNames.range_start),
        range_middle: cn(defaultClassNames.range_middle),
        range_end: cn(defaultClassNames.range_end),
        today: cn(defaultClassNames.today),
        outside: cn(defaultClassNames.outside),
        disabled: cn(defaultClassNames.disabled),
        hidden: cn(defaultClassNames.hidden),
        ...classNames,
      }}
      components={{
        Root: ({ className, rootRef, ...props }) => {
          return (
            <div
              data-slot="calendar"
              ref={rootRef}
              className={cn(className)}
              style={{ width: 'fit-content' }}
              {...props}
            />
          )
        },
        Chevron: ({ className, orientation, ...props }) => {
          const iconStyle = { width: '1rem', height: '1rem' }
          if (orientation === "left") {
            return (
              <ChevronLeftIcon className={cn(className)} style={iconStyle} {...props} />
            )
          }

          if (orientation === "right") {
            return (
              <ChevronRightIcon className={cn(className)} style={iconStyle} {...props} />
            )
          }

          return (
            <ChevronDownIcon className={cn(className)} style={iconStyle} {...props} />
          )
        },
        DayButton: CalendarDayButton,
        WeekNumber: ({ children, ...props }) => {
          return (
            <td {...props}>
              <div style={{
                display: 'flex',
                width: 'var(--cell-size, 2rem)',
                height: 'var(--cell-size, 2rem)',
                alignItems: 'center',
                justifyContent: 'center',
                textAlign: 'center',
              }}>
                {children}
              </div>
            </td>
          )
        },
        ...components,
      }}
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
  const defaultClassNames = getDefaultClassNames()

  const ref = React.useRef<HTMLButtonElement>(null)
  React.useEffect(() => {
    if (modifiers.focused) ref.current?.focus()
  }, [modifiers.focused])

  return (
    <Button
      ref={ref}
      variant="ghost"
      size="icon"
      data-day={day.date.toLocaleDateString()}
      data-selected-single={
        modifiers.selected &&
        !modifiers.range_start &&
        !modifiers.range_end &&
        !modifiers.range_middle
      }
      data-range-start={modifiers.range_start}
      data-range-end={modifiers.range_end}
      data-range-middle={modifiers.range_middle}
      className={cn(defaultClassNames.day, className)}
      style={{
        display: 'flex',
        aspectRatio: '1',
        width: '100%',
        minWidth: 'var(--cell-size, 2rem)',
        flexDirection: 'column',
        gap: '0.25rem',
        lineHeight: 1,
        fontWeight: 400,
      }}
      {...props}
    />
  )
}

export { Calendar, CalendarDayButton }
