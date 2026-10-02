import * as React from 'react'

import { c, type DocParts, doc } from '@/lib/doc.tsx'

import { Calendar } from './calendar.tsx'

// A fixed month keeps the server render and the first client render equal.
const month = new Date(2026, 9, 1)

function SingleDate({ Picker }: { Picker: DocParts[string] }) {
  const [date, setDate] = React.useState<Date | undefined>(
    new Date(2026, 9, 14),
  )
  return <Picker mode="single" selected={date} onSelect={setDate} />
}

export default doc({
  description:
    'A month grid for picking a date. The arrow keys move between days; the buttons at the top change the month.',
  components: [
    c(
      { Calendar },
      { defaultMonth: month, today: month, showOutsideDays: true },
    ),
  ],
  preview: (C) => <SingleDate Picker={C.Calendar} />,
})
