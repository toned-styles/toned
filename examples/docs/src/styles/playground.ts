import { stylesheet } from '@toned/systems/base'

export const playgroundStyles = stylesheet({
  container: {
    flexLayout: 'column',
    gap: 3,
  },
  title: {
    fontSize: '28px',
    fontWeight: 700,
    letterSpacing: '-0.02em',
    textColor: 'default',
  },
  description: {
    fontSize: '14px',
    textColor: 'subtle',
    lineHeight: 1.5,
    marginTop: 0.5,
  },
  exportBadge: {
    fontSize: '12px',
    textColor: 'muted',
    fontFamily: 'monospace',
    marginTop: 0.5,
  },
  preview: {
    borderColor: 'subtle',
    borderWidth: 'thin',
    borderRadius: 'large',
    paddingX: 4,
    paddingY: 4,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100px',
    bgColor: 'default',
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
    borderRadius: 'large',
    paddingX: 3,
    paddingY: 3,
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
