import { Link } from '@tanstack/react-router'
import { useStyles } from '@toned/react'
import type { ReactNode } from 'react'

import { homeStyles } from '../../styles/home.ts'

const atom = (
  <>
    <circle r="2.05" fill="currentColor" />
    <g fill="none" stroke="currentColor" strokeWidth="1">
      <ellipse rx="11" ry="4.2" />
      <ellipse rx="11" ry="4.2" transform="rotate(60)" />
      <ellipse rx="11" ry="4.2" transform="rotate(120)" />
    </g>
  </>
)

const icons = {
  react: (
    <svg aria-hidden="true" width="36" height="36" viewBox="-12 -12 24 24">
      {atom}
    </svg>
  ),
  // The same mark inside a handset.
  native: (
    <svg aria-hidden="true" width="36" height="36" viewBox="-12 -12 24 24">
      <rect
        x="-7.5"
        y="-11.5"
        width="15"
        height="23"
        rx="3"
        fill="none"
        stroke="currentColor"
        strokeWidth="1"
      />
      <g transform="scale(0.5)">{atom}</g>
    </svg>
  ),
  email: (
    <svg
      aria-hidden="true"
      width="36"
      height="36"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.25"
      strokeLinejoin="round"
    >
      <rect x="2.5" y="5" width="19" height="14" rx="2.5" />
      <path d="M3 7l9 6.5L21 7" />
    </svg>
  ),
  pdf: (
    <svg
      aria-hidden="true"
      width="36"
      height="36"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.25"
      strokeLinejoin="round"
    >
      <path d="M6 2.5h8l4.5 4.5v14.5h-12.5z" />
      <path d="M14 2.5v4.5h4.5" />
      <path d="M8.5 13h7M8.5 16.5h7" />
    </svg>
  ),
} satisfies Record<string, ReactNode>

const platforms = [
  {
    icon: 'react',
    name: 'React',
    note: 'Web, SSR and Server Components',
    to: '/guides/react-web',
  },
  {
    icon: 'native',
    name: 'React Native',
    note: 'iOS and Android',
    to: '/guides/react-native',
  },
  {
    icon: 'email',
    name: 'Email',
    note: 'Inline styles for HTML email',
    topic: 'renderers',
  },
  {
    icon: 'pdf',
    name: 'PDF',
    note: 'A style profile for documents',
    topic: 'renderers',
  },
] as const

/** The four targets one stylesheet resolves for. */
export function Platforms() {
  const s = useStyles(homeStyles)
  return (
    <div {...s.Platforms} role="list" aria-label="Platforms">
      {platforms.map((item) => {
        const content = (
          <>
            <span {...s.PlatformIcon}>{icons[item.icon]}</span>
            <span {...s.PlatformName}>{item.name}</span>
            <span {...s.PlatformNote}>{item.note}</span>
          </>
        )
        return (
          <div key={item.name} role="listitem">
            {'to' in item ? (
              <Link to={item.to} {...s.Platform}>
                {content}
              </Link>
            ) : (
              <Link
                to="/learn/$topic"
                params={{ topic: item.topic }}
                {...s.Platform}
              >
                {content}
              </Link>
            )}
          </div>
        )
      })}
    </div>
  )
}
