import { stylesheet } from '@toned/systems/base'

export const layoutStyles = stylesheet({
  root: {
    style: {
      display: 'flex',
      minHeight: '100vh',
      fontFamily:
        '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    },
  },
  sidebar: {
    bgColor: 'muted',
    style: {
      width: '260px',
      padding: '24px 16px',
      borderRight: '1px solid var(--border)',
      overflowY: 'auto' as const,
      position: 'sticky' as const,
      top: 0,
      height: '100vh',
    },
  },
  content: {
    style: {
      flex: 1,
      padding: '32px 48px',
      maxWidth: '800px',
    },
  },
})
