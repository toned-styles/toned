import { Link } from '@tanstack/react-router'
import { useStyles } from '@toned/react'
import { homeStyles } from '../styles/home.ts'

export function SiteHeader() {
  const s = useStyles(homeStyles)
  return (
    <header {...s.Header}>
      <Link to="/" aria-label="Toned home">
        <img src="/brand/toned-logo.svg" width="130" height="32" alt="Toned" />
      </Link>
      <nav {...s.Nav} aria-label="Main navigation">
        <Link to="/ui">UI library</Link>
        <Link to="/playground">Playground</Link>
        <Link to="/getting-started">Docs</Link>
        <a href="https://github.com/toned-styles/toned" {...s.DesktopLink}>
          GitHub
        </a>
      </nav>
    </header>
  )
}
