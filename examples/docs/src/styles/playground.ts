import { stylesheet } from './system.ts'

/** The component gallery's detail page: preview stage and prop controls. */
export const playgroundStyles = stylesheet({
  container: { flexLayout: 'column', gap: 5 },
  title: { textStyle: 'title', weight: 'bold', text: 'default' },
  description: {
    marginTop: 3,
    measure: 'article',
    textStyle: 'lead',
    text: 'muted',
  },
  exportBadge: {
    marginTop: 3,
    font: 'mono',
    textStyle: 'label',
    text: 'faint',
  },
  preview: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '240px',
    padding: 5,
    radius: '2xl',
    fill: 'surface',
    texture: 'dots-wide',
    border: 'all',
    borderTone: 'default',
  },
  compoundNotice: {
    flexLayout: 'column',
    alignItems: 'center',
    gap: 1,
    paddingY: 3,
    textStyle: 'caption',
    textColor: 'muted',
  },
  controls: {
    padding: 5,
    radius: '2xl',
    fill: 'surface',
    border: 'all',
    borderTone: 'default',
  },
  controlsTitle: {
    marginBottom: 3,
    textStyle: 'label',
    weight: 'heavy',
    text: 'default',
  },
  controlGrid: { flexLayout: 'column', gap: 2 },
  controlRow: { display: 'flex', alignItems: 'center', gap: 2 },
  controlInput: { flexGrow: '1', minWidth: 0 },
  readOnly: { font: 'mono', textStyle: 'label', text: 'faint' },
  errorBanner: {
    paddingX: 3,
    paddingY: 2,
    radius: 'md',
    textStyle: 'caption',
    bgColor: 'destructive',
    textColor: 'on_destructive',
  },
})
