import { stylesheet } from '@toned/systems/base'

export const playgroundStyles = stylesheet({
  container: {
    flexLayout: 'column',
    gap: 5,
  },
  title: {
    fontSize: '30px',
    fontWeight: 700,
    letterSpacing: '-0.025em',
    style: {
      background: 'var(--gradient-brand-text)',
      WebkitBackgroundClip: 'text',
      WebkitTextFillColor: 'transparent',
      backgroundClip: 'text',
    },
  },
  description: {
    fontSize: '15px',
    textColor: 'subtle',
    lineHeight: 1.6,
    marginTop: 1,
  },
  exportBadge: {
    fontSize: '12px',
    textColor: 'muted',
    fontFamily: 'monospace',
    marginTop: 1,
  },
  preview: {
    borderColor: 'default',
    borderWidth: 'thin',
    borderRadius: 'xlarge',
    paddingX: 5,
    paddingY: 5,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '240px',
    bgColor: 'default',
    style: {
      backgroundImage:
        'radial-gradient(circle, var(--border) 1px, transparent 1px)',
      backgroundSize: '20px 20px',
    },
  },
  compoundNotice: {
    flexLayout: 'column',
    alignItems: 'center',
    gap: 1,
    paddingY: 3,
    textColor: 'muted',
    fontSize: '13px',
  },
  controls: {
    borderColor: 'subtle',
    borderWidth: 'thin',
    borderRadius: 'xlarge',
    paddingX: 4,
    paddingY: 4,
    bgColor: 'muted',
  },
  controlsTitle: {
    fontSize: '11px',
    fontWeight: 600,
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
    textColor: 'muted',
    marginBottom: 2,
  },
  controlGrid: {
    flexLayout: 'column',
    gap: 2,
  },
  controlRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 2,
  },
  controlInput: {
    flexGrow: '1',
    minWidth: '0',
  },
  readOnly: {
    fontSize: '12px',
    textColor: 'muted',
    fontFamily: 'monospace',
  },
  errorBanner: {
    paddingX: 3,
    paddingY: 2,
    borderRadius: 'medium',
    bgColor: 'destructive',
    textColor: 'on_destructive',
    fontSize: '13px',
  },
})
