import { Link, useRouterState } from '@tanstack/react-router'
import { useStyles } from '@toned/react'
import { stylesheet } from '@toned/systems/base'
import { componentNames } from '../lib/component-registry.ts'

const uiSidebarStyles = stylesheet({
  sidebar: {
    width: '200px',
    flexShrink: '0',
    display: 'none',
    '@md': {
      display: 'block',
    },
  },
  sectionTitle: {
    fontSize: '11px',
    fontWeight: 600,
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
    paddingY: 0.5,
    paddingX: 1.25,
    marginBottom: 0.25,
    textColor: 'muted',
    opacity: 0.7,
  },
  link: {
    display: 'block',
    paddingY: 0.5,
    paddingX: 1.25,
    borderRadius: 'medium',
    textDecoration: 'none',
    fontSize: '13px',
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
}).variants<{
  active?: 'true'
}>(($) => ({
  [$.active('true')]: {
    link: {
      bgColor: 'action',
      textColor: 'on_action',
      fontWeight: 500,
      ':hover': {
        bgColor: 'action',
      },
    },
  },
}))

export function UiSidebar() {
  const pathname = useRouterState({ select: (state) => state.location.pathname })

  return (
    <nav {...useStyles(uiSidebarStyles, {}).sidebar}>
      <div {...useStyles(uiSidebarStyles, {}).sectionTitle}>Components</div>
      {componentNames.map((name) => (
        <NavLink key={name} name={name} isActive={pathname === `/ui/${name}`} />
      ))}
    </nav>
  )
}

function NavLink({ name, isActive }: { name: string; isActive: boolean }) {
  const s = useStyles(uiSidebarStyles, { active: isActive ? 'true' : undefined })
  return (
    <Link to={`/ui/${name}` as string} {...s.link}>
      {name.charAt(0).toUpperCase() + name.slice(1)}
    </Link>
  )
}
