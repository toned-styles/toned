import { useRouterState } from '@tanstack/react-router'
import { useStyles } from '@toned/react'
import { useEffect, useState } from 'react'
import { tocStyles } from '../../styles/site.ts'

type Heading = { id: string; text: string; depth: 2 | 3 }

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

/**
 * "On this page": lists the article's h2/h3 headings that carry an id and
 * highlights the section in view. It only reads the DOM — the article may
 * still be hydrating, so mutating it here would cause a mismatch. Headings
 * therefore get their ids in render (see ReferenceMarkdown and the guides).
 */
export function Toc({ containerId }: { containerId: string }) {
  const s = useStyles(tocStyles)
  const pathname = useRouterState({
    select: (state) => state.location.pathname,
  })
  const [headings, setHeadings] = useState<Heading[]>([])
  const [active, setActive] = useState('')

  useEffect(() => {
    const root = document.getElementById(containerId)
    if (!root) return
    const found: Heading[] = []
    for (const element of root.querySelectorAll<HTMLElement>(
      'h2[id], h3[id]',
    )) {
      if (element.closest('[data-toc-skip]')) continue
      const text = element.textContent?.trim() ?? ''
      if (text)
        found.push({
          id: element.id,
          text,
          depth: element.tagName === 'H3' ? 3 : 2,
        })
    }
    setHeadings(found.slice(0, 60))
    setActive(found[0]?.id ?? '')
    if (!found.length) return
    // The active section is the last heading scrolled above the fold line.
    let frame = 0
    const update = () => {
      frame = 0
      let current = found[0].id
      for (const heading of found) {
        const element = document.getElementById(heading.id)
        if (element && element.getBoundingClientRect().top < 120)
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
  }, [containerId, pathname])

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
