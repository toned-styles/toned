import { createInlineRenderer } from '@toned/core/server'
import { noticeStyles } from './styles.ts'
import { ui } from './system.ts'

// No React and no stylesheet: the core resolves the sheet to plain props.
const email = createInlineRenderer(ui, { tokens: {} })

export function noticeEmailProps(variants: {
  tone: 'info' | 'success' | 'danger'
  size: 'regular' | 'compact'
}) {
  return email.resolve(noticeStyles, { variants })
}
