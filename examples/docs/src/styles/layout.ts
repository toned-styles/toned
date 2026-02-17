import { stylesheet } from '@toned/systems/base'

export const layoutStyles = stylesheet({
  root: {
    display: 'flex',
    minHeight: '100vh',
    fontFamily:
      '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  },
  sidebar: {
    bgColor: 'muted',
    width: '260px',
    paddingY: 3,
    paddingX: 2,
    borderColor: 'subtle',
    borderWidth: 'thin',
    overflowY: 'auto',
    position: 'sticky',
    top: 0,
    height: '100vh',
    style: {
      borderTop: 'none',
      borderBottom: 'none',
      borderLeft: 'none',
    },
  },
  content: {
    flexGrow: '1',
    paddingY: 4,
    paddingX: 6,
    maxWidth: '800px',
  },
})
