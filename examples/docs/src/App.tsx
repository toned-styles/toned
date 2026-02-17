import { useStyles } from '@toned/react'
import { useEffect, useState } from 'react'
import { Page } from './components/Page.tsx'
import { Sidebar } from './components/Sidebar.tsx'
import { layoutStyles } from './styles/layout.ts'

export function App() {
  const s = useStyles(layoutStyles)
  const [page, setPage] = useState(
    window.location.hash.slice(1) || 'getting-started',
  )

  useEffect(() => {
    const handler = () =>
      setPage(window.location.hash.slice(1) || 'getting-started')
    window.addEventListener('hashchange', handler)
    return () => window.removeEventListener('hashchange', handler)
  }, [])

  return (
    <div {...s.root}>
      <nav {...s.sidebar}>
        <Sidebar currentPage={page} />
      </nav>
      <main {...s.content}>
        <Page page={page} />
      </main>
    </div>
  )
}
