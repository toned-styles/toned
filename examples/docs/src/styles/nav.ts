import type { Variants } from '@toned/core'
import { stylesheet } from '@toned/systems/base'

export const navStyles = stylesheet({
  link: {
    display: 'block',
    paddingY: 0.75,
    paddingX: 1.5,
    borderRadius: 'large',
    textDecoration: 'none',
    fontSize: '13.5px',
    lineHeight: 1.5,
    cursor: 'pointer',
    textColor: 'subtle',
    style: {
      transition: 'background-color 0.15s ease, color 0.15s ease',
    },
    ':hover': {
      bgColor: 'subtle',
    },
  },
  section: {
    marginBottom: 3,
  },
  sectionTitle: {
    fontSize: '11px',
    fontWeight: 600,
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
    paddingY: 0.5,
    paddingX: 1.5,
    marginBottom: 0.5,
    marginTop: 2,
    textColor: 'muted',
    opacity: 0.7,
  },
  logo: {
    display: 'block',
    paddingY: 3,
    paddingX: 1.5,
  },
}).variants(($: Variants<{ active?: 'true' }>) => ({
  [$.active('true')]: {
    link: {
      textColor: 'on_action',
      fontWeight: 500,
      style: {
        backgroundImage: 'var(--gradient-brand)',
      },
      ':hover': {
        style: {
          backgroundImage: 'var(--gradient-brand)',
        },
      },
    },
  },
}))
