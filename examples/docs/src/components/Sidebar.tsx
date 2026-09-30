import { Link, useRouterState } from '@tanstack/react-router'
import { useStyles } from '@toned/react'
import { docsNav } from '../content/nav.ts'
import { sidebarStyles } from '../styles/site.ts'

function SidebarLink({
  to,
  label,
  active,
}: {
  to: string
  label: string
  active: boolean
}) {
  const s = useStyles(sidebarStyles, { active })
  return (
    <Link to={to} {...s.Link} aria-current={active ? 'page' : undefined}>
      {label}
    </Link>
  )
}

/** Documentation navigation, shared by the desktop sidebar and the mobile drawer. */
export function Sidebar() {
  const s = useStyles(sidebarStyles)
  const pathname = useRouterState({
    select: (state) => state.location.pathname.replace(/\/$/, ''),
  })
  return (
    <div>
      {docsNav.map((section) => (
        <div key={section.title} {...s.Group}>
          <div {...s.Heading}>{section.title}</div>
          {section.items.map((item) => (
            <SidebarLink
              key={item.to}
              to={item.to}
              label={item.label}
              active={pathname === item.to}
            />
          ))}
        </div>
      ))}
    </div>
  )
}
