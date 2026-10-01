import { stylesheet, type Variants } from './system.ts'

export type ButtonVariants = {
  size: 'small' | 'medium' | 'large'
  tone: 'action' | 'secondary' | 'danger'
  disabled: boolean
}

// The base vocabulary: spacing steps, semantic colours and typography.
export const buttonStyles = stylesheet({
  Root: {
    $kind: 'pressable',
    display: 'inline-flex',
    alignItems: 'center',
    gap: 2,
    paddingX: 4,
    paddingY: 2,
    borderRadius: 'large',
    bgColor: 'action',
    textColor: 'on_action',
    typography: 'label-medium',
    shadow: 'small',
    cursor: 'pointer',
    ':hover': { opacity: 0.88, shadow: 'medium' },
  },
  Badge: {
    $kind: 'text',
    paddingX: 2,
    borderRadius: 'full',
    bgColor: 'default',
    textColor: 'default',
    typography: 'label-small',
  },
}).variants(
  ($: Variants<ButtonVariants>) => ({
    [$.size('small')]: {
      Root: { paddingX: 3, paddingY: 1, typography: 'label-small' },
    },
    [$.size('large')]: {
      Root: { paddingX: 6, paddingY: 3, typography: 'label-large' },
    },
    [$.tone('secondary')]: {
      Root: { bgColor: 'action_secondary', textColor: 'on_action_secondary' },
    },
    [$.tone('danger')]: {
      Root: { bgColor: 'destructive', textColor: 'on_destructive' },
    },
    [$.disabled(true)]: {
      Root: { opacity: 0.45, cursor: 'not-allowed', shadow: 'none' },
    },
  }),
  { defaults: { size: 'medium', tone: 'action', disabled: false } },
)
