import { createRootRoute, Outlet, useRouterState } from '@tanstack/react-router'
import { useStyles } from '@toned/react'
import { useEffect } from 'react'
import { Sidebar } from '../components/Sidebar.tsx'
import { layoutStyles } from '../styles/layout.ts'

export const Route = createRootRoute({
  component: RootLayout,
})

function RootLayout() {
  const s = useStyles(layoutStyles)

  // Close menu on route change
  const pathname = useRouterState({
    select: (state) => state.location.pathname,
  })
  useEffect(() => {
    const toggle = document.getElementById('menu-toggle') as HTMLInputElement
    if (toggle) toggle.checked = false
  }, [pathname])

  return (
    <div {...s.root}>
      <input type="checkbox" id="menu-toggle" hidden />
      <label
        htmlFor="menu-toggle"
        {...s.hamburger}
        role="button"
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
      </label>
      <label
        htmlFor="menu-toggle"
        {...s.overlay}
        role="presentation"
        aria-hidden="true"
      />
      <nav {...s.sidebar}>
        <Sidebar />
      </nav>
      <main {...s.content}>
        <Outlet />
      </main>
    </div>
  )
}
