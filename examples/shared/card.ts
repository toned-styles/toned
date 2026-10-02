import { ui } from './system.ts'

export const cardStyles = ui.stylesheet((q) => ({
  Root: {
    bgColor: 'default',
    alignItems: 'flex-start',
    flexLayout: 'column',
    gap: 2,
    padding: 4,
  },
  Hint: { $kind: 'text', textColor: 'status_info' },
  Code: {
    $kind: 'text',
    textColor: 'destructive',
    [q.state('hover')]: { textColor: 'default' },
  },
}))
