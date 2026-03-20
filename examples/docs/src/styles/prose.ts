import { stylesheet } from '@toned/systems/base'

export const proseStyles = stylesheet({
  container: {
    lineHeight: 1.7,
    fontSize: '16px',
    textColor: 'default',
  },
  h1: {
    fontSize: '32px',
    fontWeight: 700,
    marginBottom: 1.5,
    lineHeight: 1.15,
    letterSpacing: '-0.02em',
    style: {
      background: 'var(--gradient-brand-text)',
      WebkitBackgroundClip: 'text',
      WebkitTextFillColor: 'transparent',
      backgroundClip: 'text',
    },
    '@md': {
      fontSize: '36px',
    },
  },
  h2: {
    fontSize: '22px',
    fontWeight: 600,
    marginTop: 5,
    marginBottom: 1.5,
    lineHeight: 1.3,
    letterSpacing: '-0.01em',
    paddingBottom: 1,
    borderColor: 'subtle',
    borderWidth: 'thin',
    style: {
      borderTop: 'none',
      borderLeft: 'none',
      borderRight: 'none',
    },
    '@md': {
      fontSize: '24px',
    },
  },
  h3: {
    fontSize: '18px',
    fontWeight: 600,
    marginTop: 3,
    marginBottom: 1,
    lineHeight: 1.4,
  },
  code: {
    bgColor: 'muted',
    borderRadius: 'small',
    paddingY: 0.25,
    paddingX: 0.5,
    fontSize: '0.875em',
    fontFamily: '"SF Mono", "Fira Code", "Cascadia Code", monospace',
    fontWeight: 500,
  },
  codeBlock: {
    borderRadius: 'medium',
    borderColor: 'subtle',
    borderWidth: 'thin',
    overflowX: 'auto',
    marginY: 2,
    style: {
      // Let shiki control fonts and colors; provide fallback for plain code
      fontSize: '13px',
      lineHeight: 1.6,
    },
  },
})
