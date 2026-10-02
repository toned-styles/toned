import { Link, useRouterState } from '@tanstack/react-router'
import { useStyles } from '@toned/react'
import { useEffect, useRef } from 'react'

import { docsNav } from '../content/nav.ts'
import { sidebarStyles } from '../styles/site.ts'

function SidebarLink({
  to,
  label,
  active,
}: {
  to: string
  label: string
  active: boolean
}) {
  const s = useStyles(sidebarStyles, { active })
  return (
    <Link to={to} {...s.Link} aria-current={active ? 'page' : undefined}>
      {label}
    </Link>
  )
}

/** The nearest ancestor that scrolls its own content, if any. */
function scrollParent(element: HTMLElement): HTMLElement | undefined {
  for (let node = element.parentElement; node; node = node.parentElement) {
    const { overflowY } = getComputedStyle(node)
    if (
      (overflowY === 'auto' || overflowY === 'scroll') &&
      node.scrollHeight > node.clientHeight
    )
      return node
  }
  return undefined
}

/** Documentation navigation, shared by the desktop sidebar and the mobile drawer. */
export function Sidebar() {
  const s = useStyles(sidebarStyles)
  const pathname = useRouterState({
    select: (state) => state.location.pathname.replace(/\/$/, ''),
  })
  const root = useRef<HTMLDivElement>(null)

  // The sidebar keeps its own scroll position between pages. Move it only
  // when the current page's link is out of view: after a direct visit to a
  // page far down the list, or after the pager or an in-page link. `pathname`
  // is a dependency because the effect runs again for each page.
  useEffect(() => {
    const active = root.current?.querySelector<HTMLElement>(
      '[aria-current="page"]',
    )
    const scroller = active && scrollParent(active)
    if (!active || !scroller) return
    const link = active.getBoundingClientRect()
    const view = scroller.getBoundingClientRect()
    if (link.top < view.top || link.bottom > view.bottom)
      scroller.scrollTop +=
        link.top - view.top - (view.height - link.height) / 2
  }, [pathname])

  return (
    <div ref={root}>
      {docsNav.map((section) => (
        <div key={section.title} {...s.Group}>
          <div {...s.Heading}>{section.title}</div>
          {section.items.map((item) => (
            <SidebarLink
              key={item.to}
              to={item.to}
              label={item.label}
              active={pathname === item.to}
            />
          ))}
        </div>
      ))}
    </div>
  )
}
