import { Outlet, createFileRoute } from '@tanstack/react-router'
import { useStyles } from '@toned/react'
import { lazy, Suspense } from 'react'
import { PlaygroundProvider, usePlaygroundPortal } from '../../components/PlaygroundContext.tsx'
import { uiLayoutStyles } from '../../styles/ui-layout.ts'

const UiSidebar = lazy(() =>
  import('../../components/UiSidebar.tsx').then((m) => ({ default: m.UiSidebar })),
)

export const Route = createFileRoute('/ui')({
  component: UiLayout,
})

function UiLayout() {
  return (
    <PlaygroundProvider>
      <UiLayoutInner />
    </PlaygroundProvider>
  )
}

function UiLayoutInner() {
  const s = useStyles(uiLayoutStyles)
  const portalRef = usePlaygroundPortal()

  return (
    <div {...s.wrapper} data-ui-playground>
      <Suspense>
        <UiSidebar />
      </Suspense>
      <div {...s.center}>
        <Outlet />
      </div>
      <div {...s.rightPanel} ref={portalRef} />
    </div>
  )
}
