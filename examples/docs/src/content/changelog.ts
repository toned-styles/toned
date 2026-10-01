import compiler from '../../../../packages/toned-compiler/CHANGELOG.md?raw'
import core from '../../../../packages/toned-core/CHANGELOG.md?raw'
import eslint from '../../../../packages/toned-eslint-plugin/CHANGELOG.md?raw'
import react from '../../../../packages/toned-react/CHANGELOG.md?raw'
import systems from '../../../../packages/toned-systems/CHANGELOG.md?raw'
import themes from '../../../../packages/toned-themes/CHANGELOG.md?raw'

/**
 * The changelog page's data, read from each package's `CHANGELOG.md`. Those
 * files are the only source: nothing about a release is written here.
 */

/** The published packages, in the order the page lists them. */
const packages = [
  { name: '@toned/core', path: 'packages/toned-core', source: core },
  { name: '@toned/react', path: 'packages/toned-react', source: react },
  { name: '@toned/systems', path: 'packages/toned-systems', source: systems },
  { name: '@toned/themes', path: 'packages/toned-themes', source: themes },
  {
    name: '@toned/compiler',
    path: 'packages/toned-compiler',
    source: compiler,
  },
  {
    name: '@toned/eslint-plugin',
    path: 'packages/toned-eslint-plugin',
    source: eslint,
  },
] as const

export type ChangeGroup = {
  /** "Added", "Changed", "Fixed", or a heading the file uses that is none of these. */
  title: string
  /** The group's entries, as the Markdown list the file contains. */
  markdown: string
}

export type PackageRelease = {
  name: string
  /** The CHANGELOG.md this section came from, relative to the repository. */
  path: string
  /** The version this work is, or will be, published as, when the file states one. */
  version?: string
  /** Text before the first group, e.g. "First release." */
  note: string
  groups: ChangeGroup[]
}

export type Release = {
  id: string
  title: string
  /** ISO date, when the changelog states one. */
  date?: string
  packages: PackageRelease[]
}

/** Conventional-commit headings, mapped onto the page's three groups. */
const groupNames: Record<string, string> = {
  Features: 'Added',
  'Bug Fixes': 'Fixed',
  'Performance Improvements': 'Changed',
  'BREAKING CHANGES': 'Changed',
}
const groupOrder = ['Added', 'Changed', 'Fixed']

type Section = { heading: string; body: string }

/** Split on headings of one depth; text before the first is dropped. */
function sections(source: string, depth: number): Section[] {
  const mark = '#'.repeat(depth)
  const pattern = new RegExp(`^${mark} +(.+)$`, 'gm')
  const found = [...source.matchAll(pattern)]
  return found.map((match, index) => ({
    heading: (match[1] ?? '').trim(),
    body: source.slice(
      (match.index ?? 0) + match[0].length,
      found[index + 1]?.index ?? source.length,
    ),
  }))
}

function parsePackage(item: (typeof packages)[number]) {
  return sections(item.source, 1).flatMap(({ heading, body }) => {
    // "[0.4.0](compare url) (2026-08-05)", "0.1.0", or "Next release".
    const version = heading.match(/^\[?(\d+\.\d+\.\d+[\w.-]*)\]?/)?.[1]
    if (!version && !/^next release$/i.test(heading)) return []
    const date = heading.match(/\((\d{4}-\d{2}-\d{2})\)\s*$/)?.[1]
    const parts = sections(body, 3)
    const merged = new Map<string, string[]>()
    for (const part of parts) {
      const title = groupNames[part.heading] ?? part.heading
      merged.set(title, [...(merged.get(title) ?? []), part.body.trim()])
    }
    const groups = [...merged]
      .map(([title, bodies]) => ({ title, markdown: bodies.join('\n') }))
      .sort((a, b) => rank(a.title) - rank(b.title))
    const firstGroup = body.search(/^### /m)
    const note = (firstGroup < 0 ? body : body.slice(0, firstGroup)).trim()
    const release: PackageRelease = {
      name: item.name,
      path: `${item.path}/CHANGELOG.md`,
      version,
      note,
      groups,
    }
    return [{ date, release }]
  })
}

const rank = (title: string) => {
  const index = groupOrder.indexOf(title)
  return index < 0 ? groupOrder.length : index
}

const formatDate = (date: string) =>
  new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(`${date}T00:00:00Z`))

/**
 * Releases, newest first. Packages are versioned independently, so a release
 * is the set of package versions published on one date. A section without a
 * date has not been published: it belongs to the next release, whether the
 * file calls it "Next release" or names the version it will have.
 */
export function readChangelog(): Release[] {
  const next: PackageRelease[] = []
  const dated = new Map<string, PackageRelease[]>()
  for (const item of packages)
    for (const { date, release } of parsePackage(item)) {
      if (date) dated.set(date, [...(dated.get(date) ?? []), release])
      else next.push(release)
    }
  const releases: Release[] = []
  if (next.length)
    releases.push({ id: 'next', title: 'Next release', packages: next })
  for (const date of [...dated.keys()].sort().reverse())
    releases.push({
      id: date,
      title: formatDate(date),
      date,
      packages: dated.get(date) ?? [],
    })
  return releases
}
