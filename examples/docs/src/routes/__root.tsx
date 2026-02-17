import { Outlet, createRootRoute } from '@tanstack/react-router'
import { useStyles } from '@toned/react'
import { Sidebar } from '../components/Sidebar.tsx'
import { layoutStyles } from '../styles/layout.ts'

export const Route = createRootRoute({
  component: RootLayout,
})

function RootLayout() {
  const s = useStyles(layoutStyles)
  return (
    <div {...s.root}>
      <nav {...s.sidebar}>
        <Sidebar />
      </nav>
      <main {...s.content}>
        <Outlet />
      </main>
    </div>
  )
}
