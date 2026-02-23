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
    fontSize: '15px',
    fontWeight: 700,
    paddingY: 1.5,
    paddingX: 1.5,
    marginBottom: 2,
    letterSpacing: '-0.02em',
    style: {
      borderBottom: '1px solid var(--border)',
      background: 'var(--gradient-brand-text)',
      WebkitBackgroundClip: 'text',
      WebkitTextFillColor: 'transparent',
      backgroundClip: 'text',
    },
  },
}).variants<{
  active?: 'true'
}>(($) => ({
  [$.active('true')]: {
    link: {
      textColor: 'on_action',
      fontWeight: 500,
      style: {
        background: 'var(--gradient-brand)',
      },
      ':hover': {
        style: {
          background: 'var(--gradient-brand)',
        },
      },
    },
  },
}))
