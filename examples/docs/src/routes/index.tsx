import { createFileRoute, Link } from '@tanstack/react-router'
import { useStyles } from '@toned/react'

import { HowItWorks } from '../components/home/HowItWorks.tsx'
import { SupportLine } from '../components/home/SupportLine.tsx'
import { ThemeDemo } from '../components/home/ThemeDemo.tsx'
import { Tooling } from '../components/home/Tooling.tsx'
import { SiteFooter } from '../components/site/SiteFooter.tsx'
import { SiteHeader } from '../components/SiteHeader.tsx'
import { ThemeScope } from '../components/themes/ThemeScope.tsx'
import { homeStyles } from '../styles/home.ts'

import '../styles/home.css'

export const Route = createFileRoute('/')({ component: Home })

type Capability = {
  title: string
  body: string
  link: string
} & (
  | {
      to: '/api/stylesheet' | '/api/variants' | '/api/conditions'
    }
  | { topic: string }
)

const capabilities: readonly Capability[] = [
  {
    title: 'Named parts',
    body: 'A stylesheet styles a component’s root, label and action together, and binds them to elements.',
    to: '/api/stylesheet',
    link: 'stylesheet',
  },
  {
    title: 'Variants',
    body: 'Sizes, tones, states and their combinations are declared in the sheet, with typed selectors.',
    to: '/api/variants',
    link: 'variants',
  },
  {
    title: 'Conditions',
    body: 'Media queries, container queries, interaction states and cross-part relationships share one typed query builder.',
    to: '/api/conditions',
    link: 'Conditions',
  },
  {
    title: 'Tailwind backend',
    body: 'Resolve fields to utilities from your own Tailwind build, validated against the declarations they emit.',
    topic: 'backends',
    link: 'Backend integrations',
  },
  {
    title: 'Design-token exchange',
    body: 'Import and export a documented subset of the DTCG format, with diagnostics for what is not supported.',
    topic: 'tokens',
    link: 'DTCG token exchange',
  },
  {
    title: 'Measured contracts',
    body: 'Enumerate variants and themes, then check rendered geometry and contrast against rules you declare.',
    topic: 'contracts',
    link: 'Design contracts',
  },
]

const pillars = [
  {
    title: 'Build time',
    body: 'CSS is generated when you build. Nothing is injected at render.',
  },
  {
    title: 'SSR and Server Components',
    body: 'Server and static pages need no style runtime, and Server Components resolve styles without hooks.',
  },
  {
    title: 'Cross-platform',
    body: 'One stylesheet resolves for the web, React Native, email and PDF.',
  },
  {
    title: 'Design system first',
    body: 'You define the system. Components can only use what it defines.',
  },
  {
    title: 'Token first',
    body: 'Every value is a named token, from colour and type to layout.',
  },
  {
    title: 'Type safe',
    body: 'Tokens, parts and variants are typed. A wrong value does not compile.',
  },
] as const

function Pillars() {
  const s = useStyles(homeStyles)
  return (
    <div {...s.Pillars} role="list" aria-label="What Toned is built around">
      {pillars.map((item) => (
        <div key={item.title} role="listitem" {...s.Pillar}>
          <h2 {...s.PillarTitle}>{item.title}</h2>
          <p {...s.PillarBody}>{item.body}</p>
        </div>
      ))}
    </div>
  )
}

function Capabilities() {
  const s = useStyles(homeStyles)
  return (
    <section {...s.Section} id="capabilities" aria-labelledby="caps-title">
      <div {...s.SectionIntro}>
        <p {...s.Eyebrow}>Also included</p>
        <h2 id="caps-title" {...s.Heading}>
          More in the box
        </h2>
      </div>
      <div {...s.Cards}>
        {capabilities.map((item) => (
          <div key={item.title} {...s.Card}>
            <h3 {...s.CardTitle}>{item.title}</h3>
            <p {...s.CardBody}>{item.body}</p>
            {'to' in item ? (
              <Link to={item.to} {...s.TextLink}>
                {item.link}
              </Link>
            ) : (
              <Link
                to="/learn/$topic"
                params={{ topic: item.topic }}
                {...s.TextLink}
              >
                {item.link}
              </Link>
            )}
          </div>
        ))}
      </div>
      <Link to="/explore" {...s.TextLink}>
        All references
      </Link>
    </section>
  )
}

const next = [
  {
    to: '/ui',
    title: 'Components',
    body: 'A gallery of components with their source, props and scoped token overrides.',
  },
  {
    to: '/themes',
    title: 'Themes',
    body: 'The interface above in every theme, with the theme objects and tokens behind it.',
  },
  {
    to: '/playground',
    title: 'Playground',
    body: 'Edit a system, a stylesheet and a component in the browser, with type checking and completion.',
  },
  {
    to: '/examples',
    title: 'Interactive examples',
    body: 'Working demos of adaptive layout, motion, grid, document output, token exchange and contracts.',
  },
] as const

function WhereNext() {
  const s = useStyles(homeStyles)
  return (
    <section {...s.Section} id="next" aria-labelledby="next-title">
      <div {...s.SectionIntro}>
        <p {...s.Eyebrow}>Where next</p>
        <h2 id="next-title" {...s.Heading}>
          Start with the guide, or look around
        </h2>
      </div>
      <div {...s.Banner}>
        <div {...s.BannerIntro}>
          <h3 {...s.BannerTitle}>Getting started</h3>
          <p {...s.BannerText}>
            Install the packages, define a system, write a stylesheet and render
            it, with the build setup for Vite.
          </p>
        </div>
        <Link to="/getting-started" {...s.BannerLink}>
          Read the guide
        </Link>
      </div>
      <div {...s.Tiles}>
        {next.map((item) => (
          <Link key={item.to} to={item.to} {...s.Tile}>
            <span {...s.TileTitle}>{item.title}</span>
            <span {...s.TileBody}>{item.body}</span>
          </Link>
        ))}
      </div>
    </section>
  )
}

function Home() {
  const s = useStyles(homeStyles)
  return (
    <ThemeScope>
      <div {...s.Page.withProps({ className: 'tnd-home' })}>
        <a className="tnd-skip-link" href="#main">
          Skip to content
        </a>
        <SiteHeader />
        <main id="main">
          <div {...s.Container}>
            <section {...s.Hero} aria-labelledby="hero-title">
              <img
                src="/brand/toned-logo.svg"
                width="260"
                height="64"
                alt="Toned"
              />
              <h1 id="hero-title" {...s.Title}>
                Typed styling for design systems
              </h1>
              <p {...s.Lead}>
                Define your tokens once. Toned builds them into styles for the
                web, React Native, email and PDF, and TypeScript checks every
                value.
              </p>
              <div {...s.Actions}>
                <Link to="/getting-started" {...s.Primary}>
                  Get started
                </Link>
                <Link to="/playground" {...s.Secondary}>
                  Open the playground
                </Link>
              </div>
            </section>
            <SupportLine />
            <Pillars />
            <ThemeDemo />
          </div>
          <div {...s.Band}>
            <div {...s.Container}>
              <HowItWorks />
            </div>
          </div>
          <div {...s.Container}>
            <Tooling />
            <Capabilities />
            <WhereNext />
          </div>
        </main>
        <SiteFooter />
      </div>
    </ThemeScope>
  )
}
