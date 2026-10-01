import { Link } from '@tanstack/react-router'
import { useStyles } from '@toned/react'
import type { NavItem } from '../../content/nav.ts'
import { pagerStyles } from '../../styles/site.ts'

function PagerCard({
  item,
  direction,
}: {
  item: NavItem
  direction: 'prev' | 'next'
}) {
  const s = useStyles(pagerStyles, {
    align: direction === 'next' ? 'end' : undefined,
  })
  return (
    <Link to={item.to} {...s.Card}>
      <span {...s.Label}>{direction === 'prev' ? '← Previous' : 'Next →'}</span>
      <span {...s.Title}>{item.label}</span>
    </Link>
  )
}

/** Previous/next links in sidebar reading order. */
export function Pager({ prev, next }: { prev?: NavItem; next?: NavItem }) {
  const s = useStyles(pagerStyles)
  if (!prev && !next) return null
  return (
    <nav {...s.Root} aria-label="Pagination" data-toc-skip>
      {prev && <PagerCard item={prev} direction="prev" />}
      {next && <PagerCard item={next} direction="next" />}
    </nav>
  )
}
