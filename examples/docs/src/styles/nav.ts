import { stylesheet } from '@toned/systems/base'

export const navStyles = stylesheet({
  link: {
    display: 'block',
    paddingY: 0.75,
    paddingX: 1.5,
    borderRadius: 'medium',
    textDecoration: 'none',
    fontSize: '14px',
    cursor: 'pointer',
    style: {
      color: 'inherit',
      transition: 'background-color 0.15s ease, color 0.15s ease',
    },
  },
  section: {
    marginBottom: 2.5,
  },
  sectionTitle: {
    fontSize: '11px',
    fontWeight: 600,
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
    paddingY: 0.75,
    paddingX: 1.5,
    marginBottom: 0.5,
    textColor: 'muted',
  },
  logo: {
    fontSize: '18px',
    fontWeight: 700,
    paddingY: 0.75,
    paddingX: 1.5,
    marginBottom: 3,
    letterSpacing: '-0.02em',
  },
}).variants<{
  active?: 'true'
}>(($) => ({
  [$.active('true')]: {
    link: {
      bgColor: 'action',
      textColor: 'on_action',
    },
  },
}))
