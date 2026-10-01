import { createFileRoute, Link } from '@tanstack/react-router'
import { useStyles } from '@toned/react'
import { useState } from 'react'

import { references } from '../content/references.ts'
import { docsStyles, indexStyles } from '../styles/site.ts'

export const Route = createFileRoute('/explore')({ component: Explore })

const groups = [...new Set(references.map((item) => item.group))]

function Explore() {
  const d = useStyles(docsStyles)
  const s = useStyles(indexStyles)
  const [search, setSearch] = useState('')
  const query = search.toLowerCase().trim()
  const matches = references.filter((item) =>
    `${item.title} ${item.summary} ${item.group}`.toLowerCase().includes(query),
  )
  return (
    <article>
      <h1 {...d.Title}>Capabilities</h1>
      <p {...d.Lead}>
        Twenty-two references covering authoring, interaction, platforms,
        tooling and verification. Each is rendered from the Markdown kept beside
        its implementation.
      </p>
      <div {...s.Actions}>
        <Link to="/getting-started" {...s.Primary}>
          Getting started →
        </Link>
        <Link to="/examples" {...s.Secondary}>
          Interactive examples
        </Link>
        <Link to="/ui" {...s.Secondary}>
          56 components
        </Link>
      </div>
      <label {...s.Search}>
        <span className="visually-hidden">Find a capability</span>
        <svg
          {...s.SearchIcon}
          aria-hidden="true"
          width="18"
          height="18"
          viewBox="0 0 20 20"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        >
          <circle cx="9" cy="9" r="6" />
          <path d="M14 14l4 4" />
        </svg>
        <input
          {...s.Input}
          type="search"
          maxLength={100}
          placeholder="Search — try motion, PDF, tokens, inspector…"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
      </label>
      <p role="status" {...s.Count}>
        {query
          ? `${matches.length} of ${references.length} references match`
          : `${references.length} references in ${groups.length} groups`}
      </p>
      {groups.map((group) => {
        const items = matches.filter((item) => item.group === group)
        return items.length ? (
          <section key={group} {...s.Group} aria-labelledby={`group-${group}`}>
            <h2 id={`group-${group}`} {...s.GroupTitle}>
              {group}
            </h2>
            <div {...s.Grid}>
              {items.map((item) => (
                <Link
                  to="/learn/$topic"
                  params={{ topic: item.slug }}
                  key={item.slug}
                  {...s.Card}
                >
                  <span {...s.CardTitle}>{item.title}</span>
                  <span {...s.CardBody}>{item.summary}</span>
                  <span {...s.CardMore} aria-hidden="true">
                    Read reference →
                  </span>
                </Link>
              ))}
            </div>
          </section>
        ) : null
      })}
      {!matches.length && (
        <p {...s.Empty}>
          Nothing matches “{search}”. Try “native”, “theme” or “source”.
        </p>
      )}
      <p {...s.Note}>
        What changed in each release is in the{' '}
        <Link to="/changelog" {...d.MetaLink}>
          changelog
        </Link>
        .
      </p>
    </article>
  )
}
