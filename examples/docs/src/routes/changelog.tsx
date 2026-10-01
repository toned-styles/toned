import { createFileRoute } from '@tanstack/react-router'
import { useStyles } from '@toned/react'

import { ReferenceMarkdown } from '../components/ReferenceMarkdown.tsx'
import type { PackageRelease, Release } from '../content/changelog.ts'
import { sourceBase } from '../content/references.ts'
import { proseStyles } from '../styles/prose.ts'

export const Route = createFileRoute('/changelog')({
  // The package changelogs load with this page only.
  loader: async () => (await import('../content/changelog.ts')).readChangelog(),
  component: Changelog,
})

/** `@toned/core` → `core`, for an anchor that reads well in a URL. */
const shortName = (name: string) => name.replace(/^@toned\//, '')

function PackageSection({
  release,
  item,
}: {
  release: Release
  item: PackageRelease
}) {
  const s = useStyles(proseStyles)
  return (
    <section aria-labelledby={`${release.id}-${shortName(item.name)}`}>
      <h3 {...s.h3} id={`${release.id}-${shortName(item.name)}`}>
        <code {...s.code}>{item.name}</code>
        {item.version ? ` ${item.version}` : null}
      </h3>
      {item.note ? (
        <ReferenceMarkdown source={item.note} path={item.path} />
      ) : null}
      {item.groups.map((group) => (
        <div key={group.title}>
          <p>
            <strong>{group.title}</strong>
          </p>
          <ReferenceMarkdown source={group.markdown} path={item.path} />
        </div>
      ))}
    </section>
  )
}

function Changelog() {
  const releases = Route.useLoaderData()
  const s = useStyles(proseStyles)
  return (
    <article {...s.container}>
      <h1 {...s.h1}>Changelog</h1>
      <p>
        What was added, changed and fixed in each release, per package. The
        packages are versioned independently, so a release is listed by its date
        with the version each package received. This page is generated from the{' '}
        <code {...s.code}>CHANGELOG.md</code> file of each package.
      </p>
      {releases.map((release) => (
        <section key={release.id} aria-labelledby={release.id}>
          <h2 {...s.h2} id={release.id}>
            {release.title}
          </h2>
          {release.id === 'next' ? (
            <p>
              Changes that are merged and will be published with the next
              version of each package.
            </p>
          ) : null}
          {release.packages.map((item) => (
            <PackageSection key={item.name} release={release} item={item} />
          ))}
        </section>
      ))}
      <p>
        Each package keeps its own file, for example{' '}
        <a href={`${sourceBase}packages/toned-core/CHANGELOG.md`}>
          packages/toned-core/CHANGELOG.md
        </a>
        .
      </p>
    </article>
  )
}
