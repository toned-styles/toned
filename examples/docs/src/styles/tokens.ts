import { stylesheet } from '@toned/systems/base'

/**
 * Shared design tokens for the toned-styles documentation site.
 *
 * These stylesheets provide reusable, composable primitives that dogfood
 * the toned-styles library. The `stylesheet` function comes from the base
 * system, which provides tokens such as bgColor, textColor, borderRadius,
 * borderColor, borderWidth, paddingX, paddingY, shadow, typo, etc.
 *
 * For CSS properties not covered by tokens (display, position, cursor, ...),
 * use the `style` escape hatch.
 */

/** Card-like surface with subtle background and rounded corners. */
export const cardStyles = stylesheet({
  card: {
    bgColor: 'elevated',
    borderRadius: 'large',
    borderColor: 'subtle',
    borderWidth: 'thin',
    shadow: 'small',
    style: {
      padding: '24px',
    },
  },
})

/** Inline badge / chip for labelling items. */
export const badgeStyles = stylesheet({
  badge: {
    bgColor: 'muted',
    borderRadius: 'full',
    textColor: 'subtle',
    style: {
      display: 'inline-block',
      padding: '2px 10px',
      fontSize: '12px',
      fontWeight: 500,
      lineHeight: 1.6,
    },
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
    style: {
      border: 'none',
      borderTop: '1px solid',
      borderColor: 'inherit',
      margin: '24px 0',
    },
  },
})
