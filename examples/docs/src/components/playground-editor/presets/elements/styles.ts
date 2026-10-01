import { stylesheet, type Variants } from './system.ts'

export type NoticeVariants = {
  tone: 'info' | 'success' | 'warning'
  density: 'comfortable' | 'compact'
}

// One family of five parts. A variant restyles several of them together.
export const noticeStyles = stylesheet({
  Root: {
    flexLayout: 'column',
    gap: 2,
    width: '100%',
    maxWidth: '360px',
    padding: 4,
    borderRadius: 'xlarge',
    borderWidth: 'thin',
    borderColor: 'default',
    bgColor: 'default',
    shadow: 'small',
  },
  Badge: {
    $kind: 'text',
    alignSelf: 'flex-start',
    paddingX: 2,
    borderRadius: 'full',
    bgColor: 'status_info',
    textColor: 'on_status_info',
    typography: 'label-small',
  },
  Title: { $kind: 'text', typography: 'heading-4', textColor: 'default' },
  Message: { $kind: 'text', typography: 'body-medium', textColor: 'subtle' },
  Action: {
    $kind: 'pressable',
    alignSelf: 'flex-start',
    paddingX: 3,
    paddingY: 1,
    borderRadius: 'medium',
    bgColor: 'action',
    textColor: 'on_action',
    typography: 'label-medium',
    cursor: 'pointer',
    ':hover': { opacity: 0.88 },
  },
  // A relationship between parts: hover the notice and its title responds.
  // Parts in one family share this state; no handlers, no re-render.
  'Root:hover': {
    Root: { shadow: 'medium' },
    Title: { textColor: 'action' },
  },
}).variants(
  ($: Variants<NoticeVariants>) => ({
    [$.tone('success')]: {
      Root: { borderColor: 'status_success' },
      Badge: { bgColor: 'status_success', textColor: 'on_status_success' },
    },
    [$.tone('warning')]: {
      Root: { borderColor: 'status_warning' },
      Badge: { bgColor: 'status_warning', textColor: 'on_status_warning' },
    },
    [$.density('compact')]: {
      Root: { gap: 1, padding: 3 },
      Title: { typography: 'label-large' },
      Message: { typography: 'body-small' },
    },
  }),
  { defaults: { tone: 'info', density: 'comfortable' } },
)
