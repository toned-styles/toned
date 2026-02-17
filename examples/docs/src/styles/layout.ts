import { stylesheet } from '@toned/systems/base'

export const layoutStyles = stylesheet({
  root: {
    display: 'flex',
    minHeight: '100vh',
    fontFamily:
      '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    textColor: 'default',
    bgColor: 'default',
    style: {
      WebkitFontSmoothing: 'antialiased',
    },
  },
  sidebar: {
    bgColor: 'muted',
    width: '280px',
    height: '100vh',
    overflowY: 'auto',
    paddingY: 2,
    paddingX: 1.5,
    // Mobile: fixed overlay, hidden by default
    position: 'fixed',
    top: 0,
    left: 0,
    zIndex: 40,
    display: 'none',
    style: {
      borderRight: '1px solid var(--border)',
      flexShrink: 0,
    },
    // Desktop: visible sticky sidebar
    '@md': {
      display: 'block',
      position: 'sticky',
    },
  },
  content: {
    flexGrow: '1',
    paddingTop: 5,
    paddingBottom: 8,
    paddingX: 2.5,
    minWidth: '0',
    '@md': {
      paddingX: 6,
    },
    maxWidth: '48rem',
  },
  hamburger: {
    position: 'fixed',
    top: '12px',
    left: '12px',
    zIndex: 50,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '36px',
    height: '36px',
    bgColor: 'elevated',
    borderRadius: 'medium',
    borderColor: 'subtle',
    borderWidth: 'thin',
    cursor: 'pointer',
    shadow: 'small',
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
    style: {
      backgroundColor: 'rgba(0, 0, 0, 0.4)',
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
