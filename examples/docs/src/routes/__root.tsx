import { createRootRoute, Outlet, useRouterState } from '@tanstack/react-router'
import { useStyles } from '@toned/react'
import { useEffect } from 'react'
import { ShowcaseProvider } from '../components/ShowcaseProvider.tsx'
import { Sidebar } from '../components/Sidebar.tsx'
import { SiteHeader } from '../components/SiteHeader.tsx'
import { NotFound } from '../components/site/NotFound.tsx'
import { Pager } from '../components/site/Pager.tsx'
import { SiteFooter } from '../components/site/SiteFooter.tsx'
import { Toc } from '../components/site/Toc.tsx'
import { locate } from '../content/nav.ts'
import { references } from '../content/references.ts'
import { docsStyles } from '../styles/site.ts'

export const Route = createRootRoute({
  component: RootLayout,
  notFoundComponent: () => <NotFound />,
})

/** Pages that lay out a wider canvas than a reading column. */
const widePages = new Set(['/explore', '/lab'])

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
        '/': 'Make it yours. Keep it together.',
        '/playground': 'Playground',
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

  if (routeIds.includes('/') || routeIds.includes('/playground'))
    return (
      <ShowcaseProvider>
        <Outlet />
      </ShowcaseProvider>
    )

  return <DocsLayout pathname={pathname} />
}

function DocsLayout({ pathname }: { pathname: string }) {
  const s = useStyles(docsStyles)
  const place = locate(pathname)
  return (
    <div {...s.Page}>
      <a href="#docs-main" className="tnd-skip-link">
        Skip to content
      </a>
      <SiteHeader menu={<Sidebar />} />
      <div {...s.Shell}>
        <aside {...s.Sidebar} aria-label="Documentation">
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
        <aside {...s.Rail}>
          <Toc containerId="docs-article" />
        </aside>
      </div>
      <SiteFooter />
    </div>
  )
}
