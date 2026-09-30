import { createFileRoute, Link, notFound } from '@tanstack/react-router'
import { useStyles } from '@toned/react'
import { ReferenceMarkdown } from '../../components/ReferenceMarkdown.tsx'
import { NotFound } from '../../components/site/NotFound.tsx'
import { references, sourceBase } from '../../content/references.ts'
import { docsStyles } from '../../styles/site.ts'

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
  notFoundComponent: () => <NotFound what="reference" />,
})

function ReferencePage() {
  const reference = Route.useLoaderData()
  const s = useStyles(docsStyles)
  return (
    <article>
      <h1 {...s.Title}>{reference.title}</h1>
      <p {...s.Lead}>{reference.summary}</p>
      <div {...s.Meta}>
        <a href={`${sourceBase}${reference.path}`} {...s.MetaLink}>
          {reference.path} ↗
        </a>
        <span>Rendered from this checkout’s Markdown</span>
        <Link to="/getting-started" {...s.MetaLink}>
          Release status
        </Link>
      </div>
      <div {...s.HeaderRule} />
      <ReferenceMarkdown
        source={reference.source}
        path={reference.path}
        skipTitle
      />
    </article>
  )
}
