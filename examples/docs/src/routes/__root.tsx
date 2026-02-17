import {
  Outlet,
  createRootRoute,
  useRouterState,
} from '@tanstack/react-router'
import { useStyles } from '@toned/react'
import { useEffect, useState } from 'react'
import { Sidebar } from '../components/Sidebar.tsx'
import { layoutStyles } from '../styles/layout.ts'

export const Route = createRootRoute({
  component: RootLayout,
})

function RootLayout() {
  const [menuOpen, setMenuOpen] = useState(false)
  const s = useStyles(layoutStyles, {
    menuOpen: menuOpen ? 'true' : undefined,
  })

  // Close menu on route change
  const pathname = useRouterState({
    select: (state) => state.location.pathname,
  })
  useEffect(() => {
    setMenuOpen(false)
  }, [pathname])

  return (
    <div {...s.root}>
      <button
        type="button"
        {...s.hamburger}
        onClick={() => setMenuOpen(!menuOpen)}
        aria-label="Toggle menu"
      >
        <svg
          width="20"
          height="20"
          viewBox="0 0 20 20"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        >
          <path d="M3 5h14M3 10h14M3 15h14" />
        </svg>
      </button>
      {menuOpen && (
        <div
          {...s.overlay}
          onClick={() => setMenuOpen(false)}
          onKeyDown={() => {}}
          role="presentation"
        />
      )}
      <nav {...s.sidebar}>
        <Sidebar />
      </nav>
      <main {...s.content}>
        <Outlet />
      </main>
    </div>
  )
}
