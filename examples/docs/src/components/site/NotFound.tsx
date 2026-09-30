import { Link } from '@tanstack/react-router'
import { useStyles } from '@toned/react'
import { docsStyles } from '../../styles/site.ts'

/** Shown inside the docs layout when a page or reference does not exist. */
export function NotFound({ what = 'page' }: { what?: string }) {
  const s = useStyles(docsStyles)
  return (
    <>
      <p {...s.Breadcrumb}>404</p>
      <h1 {...s.Title}>This {what} wandered off.</h1>
      <p {...s.Lead}>
        The address may have changed while the docs were reorganised. Browse the
        capability index, or start from the beginning.
      </p>
      <div {...s.Meta}>
        <Link to="/explore" {...s.MetaLink}>
          Browse all capabilities →
        </Link>
        <Link to="/getting-started" {...s.MetaLink}>
          Getting started →
        </Link>
      </div>
    </>
  )
}
