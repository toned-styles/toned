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
    bgColor: 'default',
    width: '280px',
    height: '100vh',
    overflowY: 'auto',
    // Mobile: extra top padding to clear hamburger button
    paddingTop: 14,
    paddingBottom: 3,
    paddingX: 2,
    // Mobile: fixed overlay, hidden by default
    position: 'fixed',
    top: 0,
    left: 0,
    zIndex: 40,
    display: 'none',
    alignSelf: 'stretch',
    style: {
      borderRight: '1px solid var(--border)',
      flexShrink: 0,
    },
    // Desktop: visible sticky sidebar
    '@md': {
      display: 'block',
      position: 'sticky',
      alignSelf: 'flex-start',
      paddingTop: 3,
    },
  },
  content: {
    flexGrow: '1',
    // Mobile: extra top padding to clear hamburger button
    paddingTop: 14,
    paddingBottom: 8,
    paddingX: 2.5,
    minWidth: '0',
    '@md': {
      paddingX: 6,
      paddingTop: 5,
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
    display: 'none',
    position: 'fixed',
    top: 0,
    left: 0,
    width: '100vw',
    height: '100vh',
    zIndex: 30,
    cursor: 'pointer',
    style: {
      backgroundColor: 'rgba(0, 0, 0, 0.4)',
    },
  },
})
