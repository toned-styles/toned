import { Link, useRouterState } from '@tanstack/react-router'
import { useStyles } from '@toned/react'
import { useId, useState } from 'react'
import { componentNames } from '../lib/component-registry.ts'
import { indexStyles, sidebarStyles } from '../styles/site.ts'

function title(name: string) {
  return name
    .split('-')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

function ComponentLink({
  to,
  label,
  active,
  params,
}: {
  to: '/ui' | '/ui/$component'
  label: string
  active: boolean
  params?: { component: string }
}) {
  const s = useStyles(sidebarStyles, { active })
  return (
    <Link
      to={to}
      params={params}
      {...s.Link}
      aria-current={active ? 'page' : undefined}
    >
      {label}
    </Link>
  )
}

export function UiSidebar() {
  const s = useStyles(sidebarStyles)
  const i = useStyles(indexStyles, { density: 'compact' })
  const pathname = useRouterState({
    select: (state) => state.location.pathname.replace(/\/$/, ''),
  })
  // Rendered twice (sidebar and mobile drawer), so each needs its own id.
  const searchId = useId()
  const [query, setQuery] = useState('')
  const names = componentNames.filter((name) =>
    name.includes(query.toLowerCase().trim()),
  )
  return (
    <nav aria-label="UI components">
      <div {...s.Group}>
        <ComponentLink to="/ui" label="Showcase" active={pathname === '/ui'} />
      </div>
      <div {...s.Group}>
        <label {...s.Heading} htmlFor={searchId}>
          {componentNames.length} components
        </label>
        <input
          id={searchId}
          {...i.Input}
          type="search"
          placeholder="Filter components…"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
        {names.map((name) => (
          <ComponentLink
            key={name}
            to="/ui/$component"
            params={{ component: name }}
            label={title(name)}
            active={pathname === `/ui/${name}`}
          />
        ))}
        {names.length === 0 && <p {...i.Count}>No matching components.</p>}
      </div>
    </nav>
  )
}
