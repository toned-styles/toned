import { createFileRoute, Outlet } from '@tanstack/react-router'
import { useStyles } from '@toned/react'
import { lazy, Suspense } from 'react'
import { SiteHeader } from '../../components/SiteHeader.tsx'
import { SiteFooter } from '../../components/site/SiteFooter.tsx'
import '../../styles/home.css'
import { docsStyles } from '../../styles/site.ts'

const UiSidebar = lazy(() =>
  import('../../components/UiSidebar.tsx').then((m) => ({
    default: m.UiSidebar,
  })),
)
export const Route = createFileRoute('/ui')({ component: UiLayout })

function UiLayout() {
  const s = useStyles(docsStyles)
  const sidebar = (
    <Suspense fallback={null}>
      <UiSidebar />
    </Suspense>
  )
  return (
    <div {...s.Page}>
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
            <Outlet />
          </div>
        </main>
      </div>
      <SiteFooter />
    </div>
  )
}
