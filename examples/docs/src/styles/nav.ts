import { stylesheet } from '@toned/systems/base'

export const navStyles = stylesheet({
  link: {
    display: 'block',
    paddingY: 0.625,
    paddingX: 1.25,
    borderRadius: 'medium',
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
    marginBottom: 2,
  },
  sectionTitle: {
    fontSize: '11px',
    fontWeight: 600,
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
    paddingY: 0.5,
    paddingX: 1.25,
    marginBottom: 0.25,
    marginTop: 1.5,
    textColor: 'muted',
    opacity: 0.7,
  },
  logo: {
    fontSize: '15px',
    fontWeight: 700,
    paddingY: 1.25,
    paddingX: 1.25,
    marginBottom: 1.5,
    letterSpacing: '-0.02em',
    textColor: 'default',
    style: {
      borderBottom: '1px solid var(--border)',
    },
  },
}).variants<{
  active?: 'true'
}>(($) => ({
  [$.active('true')]: {
    link: {
      bgColor: 'action',
      textColor: 'on_action',
      fontWeight: 500,
    },
  },
}))
