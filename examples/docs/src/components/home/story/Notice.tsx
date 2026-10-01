import { createElements } from '@toned/react'
import type { ReactNode } from 'react'

import { noticeStyles } from './styles.ts'

const Parts = createElements(noticeStyles)

export function Notice({
  tone,
  size,
  label,
  title,
  children,
}: {
  tone: 'info' | 'success' | 'danger'
  size: 'regular' | 'compact'
  label: string
  title: string
  children: ReactNode
}) {
  return (
    <Parts tone={tone} size={size}>
      <Parts.Root>
        <Parts.Badge as="span">{label}</Parts.Badge>
        <Parts.Title as="strong">{title}</Parts.Title>
        <Parts.Body as="p">{children}</Parts.Body>
      </Parts.Root>
    </Parts>
  )
}
