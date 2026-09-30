import { stylesheet } from '@toned/systems/base'
import { brand, fonts } from './brand.ts'

export const playgroundStyles = stylesheet({
  container: {
    flexLayout: 'column',
    gap: 5,
  },
  title: {
    fontWeight: 650,
    lineHeight: 1.1,
    letterSpacing: '-0.035em',
    style: { color: brand.ink, fontSize: 'clamp(2.1rem, 4vw, 2.75rem)' },
  },
  description: {
    fontSize: '19px',
    lineHeight: 1.6,
    marginTop: 3,
    style: { color: brand.muted, maxWidth: '760px' },
  },
  exportBadge: {
    fontSize: '12px',
    marginTop: 3,
    style: { color: brand.faint, fontFamily: fonts.mono },
  },
  preview: {
    borderRadius: 'xlarge',
    paddingX: 5,
    paddingY: 5,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '240px',
    style: {
      borderWidth: 1,
      borderStyle: 'solid',
      borderColor: brand.border,
      backgroundColor: brand.surface,
      backgroundImage: `radial-gradient(circle, ${brand.divider} 1px, transparent 1px)`,
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
    borderRadius: 'xlarge',
    paddingX: 5,
    paddingY: 5,
    style: {
      borderWidth: 1,
      borderStyle: 'solid',
      borderColor: brand.border,
      backgroundColor: brand.surface,
    },
  },
  controlsTitle: {
    fontSize: '12px',
    fontWeight: 700,
    marginBottom: 3,
    style: { color: brand.ink },
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
    style: { color: brand.faint, fontFamily: fonts.mono },
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
