import { createFileRoute, Outlet } from '@tanstack/react-router'
import { useStyles } from '@toned/react'
import { lazy, Suspense, useLayoutEffect } from 'react'
import { GalleryThemeSwitcher } from '../../components/playground/GalleryThemeSwitcher.tsx'
import {
  applyGalleryTheme,
  clearGalleryTheme,
  currentGalleryTheme,
  galleryThemeBootScript,
  useServerMarkup,
} from '../../components/playground/galleryTheme.ts'
import { SiteHeader } from '../../components/SiteHeader.tsx'
import { SiteFooter } from '../../components/site/SiteFooter.tsx'
import '../../styles/home.css'
import '../../styles/gallery-themes.css'
import { playgroundStyles } from '../../styles/playground.ts'
import { docsStyles } from '../../styles/site.ts'

const UiSidebar = lazy(() =>
  import('../../components/UiSidebar.tsx').then((m) => ({
    default: m.UiSidebar,
  })),
)
export const Route = createFileRoute('/ui')({ component: UiLayout })

function UiLayout() {
  const s = useStyles(docsStyles)
  const p = useStyles(playgroundStyles)
  // The server's HTML carries a script that applies the stored theme while
  // the page is parsed. React never creates it on the client: there the
  // layout effect below runs before paint instead.
  const serverMarkup = useServerMarkup()
  // The layout stays mounted across gallery pages, so the theme is applied
  // once on entry and removed on leaving; navigation between component pages
  // touches nothing.
  useLayoutEffect(() => {
    applyGalleryTheme(currentGalleryTheme())
    return clearGalleryTheme
  }, [])
  const sidebar = (
    <Suspense fallback={null}>
      <UiSidebar />
    </Suspense>
  )
  return (
    <div {...s.Page}>
      {serverMarkup && (
        <script
          // A constant built from the theme ids; it holds no user input.
          dangerouslySetInnerHTML={{ __html: galleryThemeBootScript }}
        />
      )}
      <a href="#component-main" className="tnd-skip-link">
        Skip to components
      </a>
      <SiteHeader menu={sidebar} />
      <div {...s.Shell} data-ui-playground>
        <aside {...s.Sidebar} aria-label="Components">
          {sidebar}
        </aside>
        <main id="component-main" tabIndex={-1} {...s.Main}>
          <div {...s.Gallery}>
            <div {...p.gallery}>
              <GalleryThemeSwitcher />
              <Outlet />
            </div>
          </div>
        </main>
      </div>
      <SiteFooter />
    </div>
  )
}
