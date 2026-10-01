import { Link, useRouterState } from '@tanstack/react-router'
import { useStyles } from '@toned/react'
import { type ReactNode, useEffect, useId, useState } from 'react'
import { headerLinks, isActive } from '../content/nav.ts'
import { docsStyles, headerStyles } from '../styles/site.ts'
import { Search } from './search/Search.tsx'

function HeaderLink({
  to,
  label,
  active,
  mobile,
}: {
  to: string
  label: string
  active: boolean
  mobile?: boolean
}) {
  const s = useStyles(headerStyles, { active })
  return (
    <Link
      to={to}
      {...(mobile ? s.MobileLink : s.Link)}
      aria-current={active ? 'page' : undefined}
    >
      {label}
    </Link>
  )
}

const githubIcon = (
  <svg
    aria-hidden="true"
    width="20"
    height="20"
    viewBox="0 0 16 16"
    fill="currentColor"
  >
    <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" />
  </svg>
)

/**
 * The one header every page shares. On small screens the menu opens a drawer
 * with the primary links, plus whatever section navigation the page provides.
 */
export function SiteHeader({ menu }: { menu?: ReactNode }) {
  const s = useStyles(headerStyles)
  const pathname = useRouterState({
    select: (state) => state.location.pathname,
  })
  const [open, setOpen] = useState(false)
  const drawerId = useId()
  const d = useStyles(docsStyles, { drawer: open ? 'open' : undefined })

  // Navigating closes the drawer; Escape closes it too.
  useEffect(() => setOpen(false), [pathname])
  useEffect(() => {
    if (!open) return
    const onKey = (event: KeyboardEvent) =>
      event.key === 'Escape' && setOpen(false)
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open])

  return (
    <>
      <header {...s.Bar}>
        <div {...s.Inner}>
          <Link to="/" {...s.Logo} aria-label="Toned home">
            <img src="/brand/toned-logo.svg" width="112" height="28" alt="" />
          </Link>
          <nav {...s.Nav} aria-label="Main navigation">
            {headerLinks.map((link) => (
              <HeaderLink
                key={link.to}
                to={link.to}
                label={link.label}
                active={isActive(pathname, link.match)}
              />
            ))}
          </nav>
          <div {...s.Spacer} />
          <div {...s.Actions}>
            <Search />
            <a
              href="https://github.com/toned-styles/toned"
              {...s.IconLink}
              aria-label="Toned on GitHub"
            >
              {githubIcon}
            </a>
            <button
              type="button"
              {...s.MenuButton}
              aria-expanded={open}
              aria-controls={drawerId}
              aria-label={open ? 'Close menu' : 'Open menu'}
              onClick={() => setOpen((value) => !value)}
            >
              <svg
                aria-hidden="true"
                width="18"
                height="18"
                viewBox="0 0 20 20"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              >
                {open ? (
                  <path d="M5 5l10 10M15 5L5 15" />
                ) : (
                  <path d="M3 5h14M3 10h14M3 15h14" />
                )}
              </svg>
            </button>
          </div>
        </div>
      </header>
      {/* Outside the header: its backdrop filter would contain a fixed child. */}
      <div id={drawerId} {...d.Drawer} hidden={!open}>
        <nav {...s.MobileNav} aria-label="Main navigation">
          {headerLinks.map((link) => (
            <HeaderLink
              key={link.to}
              to={link.to}
              label={link.label}
              active={isActive(pathname, link.match)}
              mobile
            />
          ))}
        </nav>
        {menu}
      </div>
    </>
  )
}
