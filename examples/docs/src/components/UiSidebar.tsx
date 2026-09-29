import { Link, useRouterState } from '@tanstack/react-router'
import { useStyles } from '@toned/react'
import { useState } from 'react'
import { componentNames } from '../lib/component-registry.ts'
import { libraryStyles } from '../styles/library.ts'

export function UiSidebar() {
  const s = useStyles(libraryStyles)
  const pathname = useRouterState({
    select: (state) => state.location.pathname,
  })
  const [query, setQuery] = useState('')
  const names = componentNames.filter((name) =>
    name.includes(query.toLowerCase().trim()),
  )
  return (
    <nav {...s.sidebar} aria-label="UI components">
      <Link
        to="/ui"
        {...s.link.with(
          (pathname === '/ui' || pathname === '/ui/') && s.activeLink,
        )}
        aria-current={
          pathname === '/ui' || pathname === '/ui/' ? 'page' : undefined
        }
      >
        Showcase
      </Link>
      <label {...s.eyebrow} htmlFor="component-search">
        {componentNames.length} components
      </label>
      <input
        id="component-search"
        {...s.input}
        type="search"
        placeholder="Find a component…"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
      />
      <div {...s.links}>
        {names.map((name) => (
          <Link
            key={name}
            to="/ui/$component"
            params={{ component: name }}
            {...s.link.with(pathname === `/ui/${name}` && s.activeLink)}
            aria-current={pathname === `/ui/${name}` ? 'page' : undefined}
          >
            {name.charAt(0).toUpperCase() + name.slice(1)}
          </Link>
        ))}
        {names.length === 0 && <p {...s.muted}>No matching components.</p>}
      </div>
    </nav>
  )
}
