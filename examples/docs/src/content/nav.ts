import { references } from './references.ts'

export type NavItem = { to: string; label: string }
export type NavSection = { title: string; items: readonly NavItem[] }

/** Top-level destinations in the site header. */
export const headerLinks = [
  {
    to: '/getting-started',
    label: 'Docs',
    match: ['/getting-started', '/concepts', '/api', '/guides'],
  },
  { to: '/explore', label: 'Capabilities', match: ['/explore', '/learn'] },
  { to: '/lab', label: 'Lab', match: ['/lab'] },
  { to: '/ui', label: 'Components', match: ['/ui'] },
  { to: '/playground', label: 'Playground', match: ['/playground'] },
] as const

const referenceGroups = [...new Set(references.map((item) => item.group))]

/** The documentation sidebar, in reading order. Prev/next links follow it. */
export const docsNav: readonly NavSection[] = [
  {
    title: 'Get started',
    items: [
      { to: '/getting-started', label: 'Installation' },
      { to: '/concepts', label: 'Core concepts' },
      { to: '/explore', label: 'All capabilities' },
      { to: '/lab', label: 'Capability lab' },
    ],
  },
  {
    title: 'API reference',
    items: [
      { to: '/api/define-system', label: 'defineSystem' },
      { to: '/api/stylesheet', label: 'stylesheet' },
      { to: '/api/variants', label: 'variants' },
      { to: '/api/use-styles', label: 'useStyles' },
      { to: '/api/media-queries', label: 'Media queries' },
    ],
  },
  {
    title: 'Guides',
    items: [
      { to: '/guides/react-web', label: 'React on the web' },
      { to: '/guides/react-native', label: 'React Native' },
      { to: '/guides/theming', label: 'Theming' },
      { to: '/guides/interactive', label: 'Interactive styles' },
      { to: '/guides/ssr', label: 'SSR & Server Components' },
    ],
  },
  ...referenceGroups.map((group) => ({
    title: group,
    items: references
      .filter((item) => item.group === group)
      .map((item) => ({ to: `/learn/${item.slug}`, label: item.title })),
  })),
]

const flat = docsNav.flatMap((section) =>
  section.items.map((item) => ({ ...item, section: section.title })),
)

/** Where a docs path sits: its section, and its neighbours in reading order. */
export function locate(pathname: string) {
  const path = pathname.replace(/\/$/, '') || '/'
  const index = flat.findIndex((item) => item.to === path)
  if (index < 0) return undefined
  return {
    section: flat[index].section,
    label: flat[index].label,
    prev: flat[index - 1],
    next: flat[index + 1],
  }
}

export function isActive(pathname: string, match: readonly string[]) {
  return match.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  )
}
