import { useStyles } from '@toned/react'
import { useEffect, useState } from 'react'

import { tocStyles } from '../../styles/site.ts'

type Heading = { id: string; text: string; depth: 2 | 3 }

/** The fold line: a heading above it counts as reached. */
const fold = 120
const limit = 60

function TocLink({ heading, active }: { heading: Heading; active: boolean }) {
  const s = useStyles(tocStyles, {
    active,
    depth: heading.depth === 3 ? 3 : undefined,
  })
  return (
    <a
      href={`#${heading.id}`}
      {...s.Link}
      aria-current={active ? 'location' : undefined}
    >
      {heading.text}
    </a>
  )
}

function readHeadings(root: HTMLElement): Heading[] {
  const found: Heading[] = []
  for (const element of root.querySelectorAll<HTMLElement>('h2[id], h3[id]')) {
    if (element.closest('[data-toc-skip]')) continue
    const text = element.textContent?.trim() ?? ''
    if (text)
      found.push({
        id: element.id,
        text,
        depth: element.tagName === 'H3' ? 3 : 2,
      })
    if (found.length === limit) break
  }
  return found
}

const same = (a: Heading[], b: Heading[]) =>
  a.length === b.length &&
  a.every((heading, index) => {
    const other = b[index]
    return (
      other !== undefined &&
      heading.id === other.id &&
      heading.text === other.text &&
      heading.depth === other.depth
    )
  })

/**
 * "On this page": lists the article's h2/h3 headings that carry an id and
 * highlights the section in view.
 *
 * The list follows the article element, not the URL. The router changes the
 * location when a navigation starts, while the previous page is still mounted,
 * and a reference page renders after its Markdown has loaded; reading the
 * headings when the path changes therefore read the page being left. A
 * mutation observer on the article reports each change to its content instead,
 * whatever caused it.
 *
 * It only reads the DOM. The article may still be hydrating, so headings get
 * their ids in render (see ReferenceMarkdown and the guides).
 */
export function Toc({ containerId }: { containerId: string }) {
  const s = useStyles(tocStyles)
  const [headings, setHeadings] = useState<Heading[]>([])
  const [active, setActive] = useState('')

  useEffect(() => {
    const root = document.getElementById(containerId)
    if (!root) return
    let frame = 0
    const read = () => {
      frame = 0
      const found = readHeadings(root)
      setHeadings((current) => (same(current, found) ? current : found))
    }
    // One read per frame, however many nodes a navigation replaces.
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(read)
    }
    read()
    const observer = new MutationObserver(schedule)
    observer.observe(root, { childList: true, subtree: true })
    return () => {
      observer.disconnect()
      cancelAnimationFrame(frame)
    }
  }, [containerId])

  useEffect(() => {
    // Without headings nothing renders, so a stale `active` is never shown.
    const first = headings[0]
    if (!first) return
    // The active section is the last heading scrolled above the fold line.
    let frame = 0
    const update = () => {
      frame = 0
      let current = first.id
      for (const heading of headings) {
        const element = document.getElementById(heading.id)
        if (element && element.getBoundingClientRect().top < fold)
          current = heading.id
      }
      setActive(current)
    }
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update)
    }
    update()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      window.removeEventListener('scroll', onScroll)
      cancelAnimationFrame(frame)
    }
  }, [headings])

  if (headings.length < 2) return null
  return (
    <nav {...s.Root} aria-label="On this page">
      <div {...s.Heading}>On this page</div>
      {headings.map((heading) => (
        <TocLink
          key={heading.id}
          heading={heading}
          active={heading.id === active}
        />
      ))}
    </nav>
  )
}
