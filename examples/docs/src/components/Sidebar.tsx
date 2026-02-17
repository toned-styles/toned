import { useStyles } from '@toned/react'
import { navStyles } from '../styles/nav.ts'

const NAV_SECTIONS = [
  {
    title: 'Overview',
    items: [
      { id: 'getting-started', label: 'Getting Started' },
      { id: 'concepts', label: 'Core Concepts' },
    ],
  },
  {
    title: 'API Reference',
    items: [
      { id: 'api-define-system', label: 'defineSystem' },
      { id: 'api-stylesheet', label: 'stylesheet' },
      { id: 'api-variants', label: 'variants' },
      { id: 'api-use-styles', label: 'useStyles' },
      { id: 'api-media-queries', label: 'Media Queries' },
    ],
  },
  {
    title: 'Guides',
    items: [
      { id: 'guide-react-web', label: 'React Web' },
      { id: 'guide-react-native', label: 'React Native' },
      { id: 'guide-theming', label: 'Theming' },
      { id: 'guide-interactive', label: 'Interactive Styles' },
    ],
  },
]

function NavLink({
  id,
  label,
  isActive,
}: {
  id: string
  label: string
  isActive: boolean
}) {
  const s = useStyles(navStyles, { active: isActive ? 'true' : undefined })
  return (
    <a href={`#${id}`} {...s.link}>
      {label}
    </a>
  )
}

export function Sidebar({ currentPage }: { currentPage: string }) {
  const s = useStyles(navStyles, {})
  return (
    <div>
      <div
        style={{
          fontSize: '18px',
          fontWeight: 700,
          padding: '6px 12px',
          marginBottom: '16px',
        }}
      >
        toned-styles
      </div>
      {NAV_SECTIONS.map((section) => (
        <div key={section.title} {...s.section}>
          <div {...s.sectionTitle}>{section.title}</div>
          {section.items.map((item) => (
            <NavLink
              key={item.id}
              id={item.id}
              label={item.label}
              isActive={currentPage === item.id}
            />
          ))}
        </div>
      ))}
    </div>
  )
}
