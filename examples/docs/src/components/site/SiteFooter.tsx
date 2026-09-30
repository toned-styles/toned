import { Link } from '@tanstack/react-router'
import { useStyles } from '@toned/react'
import { footerStyles } from '../../styles/site.ts'

export function SiteFooter() {
  const s = useStyles(footerStyles)
  return (
    <footer {...s.Root}>
      <div {...s.Inner}>
        <div {...s.Brand}>
          <Link to="/" aria-label="Toned home">
            <img src="/brand/toned-logo.svg" width="96" height="24" alt="" />
          </Link>
          <p>Made for the details. Open source, MIT licensed.</p>
        </div>
        <nav {...s.Links} aria-label="Footer">
          <Link to="/getting-started" {...s.Link}>
            Documentation
          </Link>
          <Link to="/explore" {...s.Link}>
            Capabilities
          </Link>
          <Link to="/ui" {...s.Link}>
            Components
          </Link>
          <Link to="/playground" {...s.Link}>
            Playground
          </Link>
          <a href="https://github.com/toned-styles/toned" {...s.Link}>
            GitHub
          </a>
        </nav>
      </div>
    </footer>
  )
}
