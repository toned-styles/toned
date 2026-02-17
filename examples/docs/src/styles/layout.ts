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
    // Mobile: fixed overlay, hidden by default
    position: 'fixed',
    top: 0,
    left: 0,
    height: '100vh',
    zIndex: 40,
    display: 'none',
    style: {
      borderTop: 'none',
      borderBottom: 'none',
      borderLeft: 'none',
    },
    // Desktop: visible sticky sidebar
    '@md': {
      display: 'block',
      position: 'sticky',
    },
  },
  content: {
    flexGrow: '1',
    paddingY: 4,
    paddingX: 3,
    maxWidth: '800px',
    '@md': {
      paddingX: 6,
    },
  },
  hamburger: {
    position: 'fixed',
    top: '12px',
    left: '12px',
    zIndex: 50,
    display: 'block',
    bgColor: 'elevated',
    borderRadius: 'medium',
    borderColor: 'subtle',
    borderWidth: 'thin',
    padding: 1,
    cursor: 'pointer',
    '@md': {
      display: 'none',
    },
  },
  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    width: '100vw',
    height: '100vh',
    zIndex: 30,
    opacity: 0.5,
    style: {
      backgroundColor: 'black',
    },
  },
}).variants<{
  menuOpen?: 'true'
}>(($) => ({
  [$.menuOpen('true')]: {
    sidebar: {
      display: 'block',
    },
  },
}))
