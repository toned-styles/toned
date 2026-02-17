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
    },
  },
  section: {
    marginBottom: 2,
  },
  sectionTitle: {
    fontSize: '12px',
    fontWeight: 600,
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    paddingY: 0.75,
    paddingX: 1.5,
    opacity: 0.6,
  },
  logo: {
    fontSize: '18px',
    fontWeight: 700,
    paddingY: 0.75,
    paddingX: 1.5,
    marginBottom: 2,
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
