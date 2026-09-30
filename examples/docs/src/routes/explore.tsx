import { createFileRoute, Link } from '@tanstack/react-router'
import { useStyles } from '@toned/react'
import { useState } from 'react'
import { references } from '../content/references.ts'
import { libraryStyles } from '../styles/library.ts'

export const Route = createFileRoute('/explore')({ component: Explore })
function Explore() {
  const s = useStyles(libraryStyles)
  const [search, setSearch] = useState('')
  const query = search.toLowerCase().trim()
  const matches = references.filter((item) =>
    `${item.title} ${item.summary} ${item.group}`.toLowerCase().includes(query),
  )
  return (
    <article {...s.stack}>
      <p {...s.eyebrow}>One vocabulary. A lot of possibilities.</p>
      <h1 {...s.title}>Explore Toned.</h1>
      <p {...s.intro}>
        Start with a button. Build a design system. Take it across platforms,
        inspect its source, and test its promises. Every capability below has a
        reference maintained beside its implementation.
      </p>
      <div {...s.row}>
        <Link to="/getting-started">Start building →</Link>
        <Link to="/lab">Try the capability lab →</Link>
        <Link to="/ui">Explore 56 components →</Link>
      </div>
      <p {...s.muted}>
        This site documents the development branch, including APIs added since
        main. Package version numbers alone do not establish feature
        availability; follow the source checkout instructions for the complete
        experience.
      </p>
      <label {...s.stack}>
        Find a capability
        <input
          {...s.input}
          type="search"
          maxLength={100}
          placeholder="Try motion, PDF, tokens, inspector…"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
      </label>
      <p role="status" {...s.muted}>
        {matches.length} references
      </p>
      {[...new Set(references.map((item) => item.group))].map((group) => {
        const items = matches.filter((item) => item.group === group)
        return items.length ? (
          <section key={group} {...s.stack} aria-label={group}>
            <h2>{group}</h2>
            <div {...s.grid}>
              {items.map((item) => (
                <Link
                  to="/learn/$topic"
                  params={{ topic: item.slug }}
                  key={item.slug}
                  {...s.panel}
                >
                  <h3>{item.title} ↗</h3>
                  <p>{item.summary}</p>
                </Link>
              ))}
            </div>
          </section>
        ) : null
      })}
      {!matches.length && <p>No matches. Try “native”, “theme” or “source”.</p>}
    </article>
  )
}
