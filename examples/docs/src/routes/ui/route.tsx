import { createFileRoute, Link, Outlet } from '@tanstack/react-router'
import { useStyles } from '@toned/react'
import { lazy, Suspense } from 'react'
import '../../styles/home.css'
import { libraryStyles } from '../../styles/library.ts'

const UiSidebar = lazy(() =>
  import('../../components/UiSidebar.tsx').then((m) => ({
    default: m.UiSidebar,
  })),
)
export const Route = createFileRoute('/ui')({ component: UiLayout })

function UiLayout() {
  const s = useStyles(libraryStyles)
  return (
    <div {...s.page}>
      <a href="#component-main" className="tnd-skip-link">
        Skip to components
      </a>
      <header {...s.header}>
        <Link to="/" aria-label="Toned home">
          <img
            src="/brand/toned-logo.svg"
            alt="Toned"
            width="130"
            height="32"
          />
        </Link>
        <nav {...s.nav} aria-label="Main navigation">
          <Link to="/ui">UI library</Link>
          <Link to="/playground">Playground</Link>
          <Link to="/getting-started">Docs</Link>
          <a href="https://github.com/toned-styles/toned/tree/main/examples/ui">
            Source ↗
          </a>
        </nav>
      </header>
      <div {...s.shell} data-ui-playground>
        <Suspense fallback={<p>Loading components…</p>}>
          <UiSidebar />
        </Suspense>
        <main id="component-main" {...s.main}>
          <Outlet />
        </main>
      </div>
    </div>
  )
}
