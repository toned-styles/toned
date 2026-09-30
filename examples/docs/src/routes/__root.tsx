import { createRootRoute, Outlet, useRouterState } from '@tanstack/react-router'
import { useStyles } from '@toned/react'
import { useEffect } from 'react'
import { ShowcaseProvider } from '../components/ShowcaseProvider.tsx'
import { Sidebar } from '../components/Sidebar.tsx'
import { references } from '../content/references.ts'
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
  const routeIds = useRouterState({
    select: (state) => state.matches.map((match) => match.routeId),
  })
  useEffect(() => {
    const toggle = document.getElementById('menu-toggle') as HTMLInputElement
    if (toggle) toggle.checked = false
    const topic = pathname.split('/')[2]
    const reference = pathname.startsWith('/learn/')
      ? references.find((item) => item.slug === topic)
      : undefined
    const label =
      reference?.title ??
      (
        {
          '/': 'Make it yours. Keep it together.',
          '/getting-started': 'Getting started',
          '/explore': 'Explore all capabilities',
          '/lab': 'The capability lab',
          '/playground': 'Interactive playground',
          '/ui': 'UI collection',
        } as Record<string, string>
      )[pathname] ??
      pathname
        .split('/')
        .filter(Boolean)
        .map((part) => part.replace(/-/g, ' '))
        .join(' · ')
    document.title = `Toned — ${label}`
  }, [pathname])

  if (routeIds.includes('/ui')) return <Outlet />

  if (routeIds.includes('/') || routeIds.includes('/playground'))
    return (
      <ShowcaseProvider>
        <Outlet />
      </ShowcaseProvider>
    )

  return (
    <div {...s.root}>
      <a href="#docs-main" {...s.skipLink}>
        Skip to content
      </a>
      <input
        type="checkbox"
        id="menu-toggle"
        className="menu-toggle"
        aria-label="Toggle menu"
        aria-controls="docs-navigation"
      />
      <label htmlFor="menu-toggle" {...s.hamburger} aria-label="Toggle menu">
        <svg
          aria-hidden="true"
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
      >
        <span className="menu-toggle">Close menu</span>
      </label>
      <nav id="docs-navigation" {...s.sidebar}>
        <Sidebar />
      </nav>
      <main id="docs-main" tabIndex={-1} {...s.content}>
        <Outlet />
      </main>
    </div>
  )
}
