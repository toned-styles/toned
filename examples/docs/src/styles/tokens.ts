import { stylesheet } from '@toned/systems/base'

/** Card-like surface with subtle background and rounded corners. */
export const cardStyles = stylesheet({
  card: {
    bgColor: 'elevated',
    borderRadius: 'large',
    borderColor: 'subtle',
    borderWidth: 'thin',
    shadow: 'small',
    padding: 3,
  },
})

/** Inline badge / chip for labelling items. */
export const badgeStyles = stylesheet({
  badge: {
    bgColor: 'muted',
    borderRadius: 'full',
    textColor: 'subtle',
    display: 'inline-block',
    paddingY: 0.25,
    paddingX: 1.25,
    fontSize: '12px',
    fontWeight: 500,
    lineHeight: 1.6,
  },
}).variants<{
  variant?: 'default' | 'success' | 'warning' | 'error'
}>(($) => ({
  [$.variant('success')]: {
    badge: {
      bgColor: 'status_success',
      textColor: 'on_status_success',
    },
  },
  [$.variant('warning')]: {
    badge: {
      bgColor: 'status_warning',
      textColor: 'on_status_warning',
    },
  },
  [$.variant('error')]: {
    badge: {
      bgColor: 'status_error',
      textColor: 'on_status_error',
    },
  },
}))

/** Divider / horizontal rule. */
export const dividerStyles = stylesheet({
  divider: {
    borderColor: 'subtle',
    marginY: 3,
    style: {
      border: 'none',
      borderTop: '1px solid',
      borderColor: 'inherit',
    },
  },
})
