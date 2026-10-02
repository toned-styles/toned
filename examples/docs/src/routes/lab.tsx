import { createFileRoute, Link, useRouter } from '@tanstack/react-router'
import { useStyles } from '@toned/react'
import { useEffect } from 'react'

import { docsStyles } from '../styles/site.ts'

/**
 * The former address of the interactive examples. It renders a short notice
 * and, once the application runs, replaces itself with `/examples`, keeping
 * the hash so links such as `/lab#grid` still reach their section.
 *
 * The move happens in an effect rather than a route redirect because this page
 * is prerendered: a redirect would resolve before hydration and the client
 * would hydrate another page's markup.
 */
export const Route = createFileRoute('/lab')({ component: Moved })

function Moved() {
  const d = useStyles(docsStyles)
  const router = useRouter()
  useEffect(() => {
    void router.navigate({
      to: '/examples',
      hash: window.location.hash.slice(1) || undefined,
      replace: true,
    })
  }, [router])
  return (
    <article>
      <h1 {...d.Title}>This page has moved</h1>
      <p {...d.Lead}>
        The interactive examples are at{' '}
        <Link to="/examples" {...d.MetaLink}>
          /examples
        </Link>
        .
      </p>
    </article>
  )
}
