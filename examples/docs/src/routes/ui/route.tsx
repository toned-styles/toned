import { Outlet, createFileRoute } from '@tanstack/react-router'
import { lazy, Suspense } from 'react'

const UiSidebar = lazy(() =>
  import('../../components/UiSidebar.tsx').then((m) => ({ default: m.UiSidebar })),
)

export const Route = createFileRoute('/ui')({
  component: UiLayout,
})

function UiLayout() {
  return (
    <div style={{ display: 'flex', gap: '1rem' }}>
      <Suspense>
        <UiSidebar />
      </Suspense>
      <div style={{ flexGrow: 1, minWidth: 0 }}>
        <Outlet />
      </div>
    </div>
  )
}
