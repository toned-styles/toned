import { stylesheet } from '@toned/systems/base'

export const proseStyles = stylesheet({
  container: {
    lineHeight: 1.7,
    fontSize: '16px',
  },
  h1: {
    fontSize: '36px',
    fontWeight: 700,
    marginBottom: 2,
    lineHeight: 1.2,
  },
  h2: {
    fontSize: '24px',
    fontWeight: 600,
    marginTop: 4,
    marginBottom: 1.5,
    lineHeight: 1.3,
  },
  h3: {
    fontSize: '20px',
    fontWeight: 600,
    marginTop: 3,
    marginBottom: 1,
  },
  code: {
    bgColor: 'muted',
    borderRadius: 'small',
    paddingY: 0.25,
    paddingX: 0.75,
    fontSize: '14px',
    fontFamily: '"SF Mono", "Fira Code", monospace',
  },
  codeBlock: {
    bgColor: 'muted',
    borderRadius: 'medium',
    padding: 2,
    fontSize: '14px',
    fontFamily: '"SF Mono", "Fira Code", monospace',
    overflowX: 'auto',
    lineHeight: 1.5,
    marginY: 2,
  },
})
