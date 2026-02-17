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
    bgColor: 'muted',
    borderRadius: 'medium',
    borderColor: 'subtle',
    borderWidth: 'thin',
    padding: 2,
    fontSize: '13px',
    fontFamily: '"SF Mono", "Fira Code", "Cascadia Code", monospace',
    overflowX: 'auto',
    lineHeight: 1.6,
    marginY: 2,
  },
})
