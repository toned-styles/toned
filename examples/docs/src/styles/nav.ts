import { stylesheet } from '@toned/systems/base'

export const navStyles = stylesheet({
  link: {
    style: {
      display: 'block',
      padding: '6px 12px',
      borderRadius: '6px',
      textDecoration: 'none',
      fontSize: '14px',
      color: 'inherit',
      cursor: 'pointer',
    },
  },
  section: {
    style: {
      marginBottom: '16px',
    },
  },
  sectionTitle: {
    style: {
      fontSize: '12px',
      fontWeight: 600,
      textTransform: 'uppercase' as const,
      letterSpacing: '0.05em',
      padding: '6px 12px',
      opacity: 0.6,
    },
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
