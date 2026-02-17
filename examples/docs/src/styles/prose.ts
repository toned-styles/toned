import { stylesheet } from '@toned/systems/base'

export const proseStyles = stylesheet({
  container: {
    style: {
      lineHeight: 1.7,
      fontSize: '16px',
    },
  },
  h1: {
    style: {
      fontSize: '36px',
      fontWeight: 700,
      marginBottom: '16px',
      lineHeight: 1.2,
    },
  },
  h2: {
    style: {
      fontSize: '24px',
      fontWeight: 600,
      marginTop: '32px',
      marginBottom: '12px',
      lineHeight: 1.3,
    },
  },
  h3: {
    style: {
      fontSize: '20px',
      fontWeight: 600,
      marginTop: '24px',
      marginBottom: '8px',
    },
  },
  code: {
    bgColor: 'muted',
    borderRadius: 'small',
    style: {
      padding: '2px 6px',
      fontSize: '14px',
      fontFamily: '"SF Mono", "Fira Code", monospace',
    },
  },
  codeBlock: {
    bgColor: 'muted',
    borderRadius: 'medium',
    style: {
      padding: '16px',
      fontSize: '14px',
      fontFamily: '"SF Mono", "Fira Code", monospace',
      overflowX: 'auto' as const,
      lineHeight: 1.5,
      marginTop: '16px',
      marginBottom: '16px',
    },
  },
})
