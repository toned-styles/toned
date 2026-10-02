import { createRootRoute, Outlet, useRouterState } from '@tanstack/react-router'
import { useStyles } from '@toned/react'
import { useEffect, useRef } from 'react'

import { ShowcaseProvider } from '../components/ShowcaseProvider.tsx'
import { Sidebar } from '../components/Sidebar.tsx'
import { NotFound } from '../components/site/NotFound.tsx'
import { Pager } from '../components/site/Pager.tsx'
import { SiteFooter } from '../components/site/SiteFooter.tsx'
import { Toc } from '../components/site/Toc.tsx'
import { SiteHeader } from '../components/SiteHeader.tsx'
import { locate } from '../content/nav.ts'
import { references } from '../content/references.ts'
import { docsStyles } from '../styles/site.ts'

export const Route = createRootRoute({
  component: RootLayout,
  notFoundComponent: () => <NotFound />,
})

/** Pages that lay out a wider canvas than a reading column. */
const widePages = new Set(['/explore', '/examples'])

function pageLabel(pathname: string) {
  const topic = pathname.split('/')[2]
  const reference = pathname.startsWith('/learn/')
    ? references.find((item) => item.slug === topic)
    : undefined
  return (
    reference?.title ??
    locate(pathname)?.label ??
    (
      {
        '/': 'Typed styling for design systems',
        '/playground': 'Playground',
        '/themes': 'Themes',
        '/ui': 'Components',
      } as Record<string, string>
    )[pathname] ??
    pathname
      .split('/')
      .filter(Boolean)
      .map((part) => part.replace(/-/g, ' '))
      .join(' · ')
  )
}

function RootLayout() {
  const pathname = useRouterState({
    select: (state) => state.location.pathname.replace(/(.)\/$/, '$1'),
  })
  const routeIds = useRouterState({
    select: (state) => state.matches.map((match) => match.routeId),
  })
  useEffect(() => {
    document.title = `Toned — ${pageLabel(pathname)}`
  }, [pathname])

  if (routeIds.includes('/ui')) return <Outlet />

  if (
    routeIds.includes('/') ||
    routeIds.includes('/playground') ||
    routeIds.includes('/themes')
  )
    return (
      <ShowcaseProvider>
        <Outlet />
      </ShowcaseProvider>
    )

  return <DocsLayout pathname={pathname} />
}

/**
 * After a client navigation to another page, focus moves to the main region,
 * so a keyboard or screen-reader user continues from the new page's content
 * rather than from the link they followed. The path is that of the rendered
 * route match, not of the location: the location changes when a navigation
 * starts, the match when the new page is on screen. The first page load and a
 * change of hash within a page leave focus alone.
 */
function useFocusMainOnNavigation() {
  const rendered = useRouterState({
    select: (state) => state.matches.at(-1)?.pathname,
  })
  const previous = useRef<string | undefined>(undefined)
  useEffect(() => {
    const from = previous.current
    previous.current = rendered
    if (from === undefined || rendered === undefined || from === rendered)
      return
    // The router owns scrolling; focusing must not move the page.
    document.getElementById('docs-main')?.focus({ preventScroll: true })
  }, [rendered])
}

function DocsLayout({ pathname }: { pathname: string }) {
  const s = useStyles(docsStyles)
  const place = locate(pathname)
  useFocusMainOnNavigation()
  return (
    <div {...s.Page}>
      <a href="#docs-main" className="tnd-skip-link">
        Skip to content
      </a>
      <SiteHeader menu={<Sidebar />} />
      <div {...s.Shell}>
        <aside
          {...s.Sidebar}
          aria-label="Documentation"
          // Names this scroll region for the router's scroll restoration.
          data-scroll-restoration-id="docs-sidebar"
        >
          <Sidebar />
        </aside>
        <main id="docs-main" tabIndex={-1} {...s.Main}>
          <div {...(widePages.has(pathname) ? s.Wide : s.Article)}>
            {place && <p {...s.Breadcrumb}>{place.section}</p>}
            <div id="docs-article">
              <Outlet />
            </div>
            <Pager prev={place?.prev} next={place?.next} />
          </div>
        </main>
        <aside id="docs-rail" {...s.Rail}>
          <Toc containerId="docs-article" />
        </aside>
      </div>
      <SiteFooter />
    </div>
  )
}
