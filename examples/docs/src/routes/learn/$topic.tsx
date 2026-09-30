import { createFileRoute, Link, notFound } from '@tanstack/react-router'
import { useStyles } from '@toned/react'
import { ReferenceMarkdown } from '../../components/ReferenceMarkdown.tsx'
import { references, sourceBase } from '../../content/references.ts'
import { libraryStyles } from '../../styles/library.ts'

export const Route = createFileRoute('/learn/$topic')({
  loader: async ({ params }) => {
    const reference = references.find((item) => item.slug === params.topic)
    if (!reference) throw notFound()
    return {
      title: reference.title,
      summary: reference.summary,
      path: reference.path,
      source: await reference.load(),
    }
  },
  component: ReferencePage,
  notFoundComponent: () => (
    <p>
      That reference does not exist.{' '}
      <Link to="/explore">Explore all capabilities</Link>.
    </p>
  ),
})

function ReferencePage() {
  const reference = Route.useLoaderData()
  const s = useStyles(libraryStyles)
  return (
    <article {...s.stack}>
      <nav {...s.row} aria-label="Reference navigation">
        <Link to="/explore">← All capabilities</Link>
        <Link to="/lab">Try the lab</Link>
      </nav>
      <p {...s.intro}>{reference.summary}</p>
      <p {...s.muted}>
        Development reference · built from this checkout.{' '}
        <a href={`${sourceBase}${reference.path}`}>Read source on GitHub</a>.
        See <Link to="/getting-started">release status and setup</Link>.
      </p>
      <ReferenceMarkdown source={reference.source} path={reference.path} />
    </article>
  )
}
