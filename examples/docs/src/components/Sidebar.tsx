import { Link, useRouterState } from '@tanstack/react-router'
import { useStyles } from '@toned/react'
import { navStyles } from '../styles/nav.ts'

const NAV_SECTIONS = [
  {
    title: 'Overview',
    items: [
      { to: '/', label: 'Getting Started' },
      { to: '/concepts', label: 'Core Concepts' },
    ],
  },
  {
    title: 'API Reference',
    items: [
      { to: '/api/define-system', label: 'defineSystem' },
      { to: '/api/stylesheet', label: 'stylesheet' },
      { to: '/api/variants', label: 'variants' },
      { to: '/api/use-styles', label: 'useStyles' },
      { to: '/api/media-queries', label: 'Media Queries' },
    ],
  },
  {
    title: 'Guides',
    items: [
      { to: '/guides/react-web', label: 'React Web' },
      { to: '/guides/react-native', label: 'React Native' },
      { to: '/guides/theming', label: 'Theming' },
      { to: '/guides/interactive', label: 'Interactive Styles' },
      { to: '/guides/ssr', label: 'SSR & SSG' },
    ],
  },
] as const

function NavLink({
  to,
  label,
  isActive,
}: {
  to: string
  label: string
  isActive: boolean
}) {
  const s = useStyles(navStyles, { active: isActive ? 'true' : undefined })
  return (
    <Link to={to} {...s.link}>
      {label}
    </Link>
  )
}

export function Sidebar() {
  const s = useStyles(navStyles, {})
  const pathname = useRouterState({ select: (state) => state.location.pathname })
  return (
    <div>
      <div {...s.logo}>toned-styles</div>
      {NAV_SECTIONS.map((section) => (
        <div key={section.title} {...s.section}>
          <div {...s.sectionTitle}>{section.title}</div>
          {section.items.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              label={item.label}
              isActive={pathname === item.to}
            />
          ))}
        </div>
      ))}
    </div>
  )
}
