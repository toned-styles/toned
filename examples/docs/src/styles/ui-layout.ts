import { stylesheet } from '@toned/systems/base'

export const uiLayoutStyles = stylesheet({
  wrapper: {
    display: 'flex',
    gap: 4,
  },
  center: {
    flexGrow: '1',
    minWidth: '0',
    paddingY: 1,
  },
  rightPanel: {
    display: 'none',
    '@md': {
      flexLayout: 'column',
      gap: 3,
      width: '340px',
      flexShrink: '0',
      position: 'sticky',
      top: '20px',
      alignSelf: 'flex-start',
      overflowY: 'auto',
      paddingLeft: 5,
      paddingY: 1,
      style: {
        maxHeight: 'calc(100vh - 40px)',
        borderLeft: '1px solid var(--border)',
      },
    },
  },
})
