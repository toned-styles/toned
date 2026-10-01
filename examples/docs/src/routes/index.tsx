import { createFileRoute, Link } from '@tanstack/react-router'
import { useStyles } from '@toned/react'
import { HowItWorks } from '../components/home/HowItWorks.tsx'
import { SupportLine } from '../components/home/SupportLine.tsx'
import { ThemeDemo } from '../components/home/ThemeDemo.tsx'
import { SiteHeader } from '../components/SiteHeader.tsx'
import { SiteFooter } from '../components/site/SiteFooter.tsx'
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
      to:
        | '/api/define-system'
        | '/api/stylesheet'
        | '/api/variants'
        | '/api/conditions'
        | '/guides/theming'
        | '/guides/ssr'
        | '/guides/react-native'
    }
  | { topic: string }
)

const capabilities: readonly Capability[] = [
  {
    title: 'Typed tokens',
    body: 'Colour, spacing, type or your own concepts. A value that is not in a token is a type error.',
    to: '/api/define-system',
    link: 'defineSystem',
  },
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
    title: 'Theming',
    body: 'Themes are typed objects. On the web they become custom properties, so a switch is CSS only.',
    to: '/guides/theming',
    link: 'Theming guide',
  },
  {
    title: 'SSR and Server Components',
    body: 'CSS is built ahead of time, so server and static pages need no style injection. A Server Component resolves props without hooks.',
    to: '/guides/ssr',
    link: 'SSR guide',
  },
  {
    title: 'React Native',
    body: 'The same declarations resolve to native values through a host adapter. Native support is verified per host; native grid is not supported.',
    to: '/guides/react-native',
    link: 'React Native guide',
  },
  {
    title: 'Email and PDF output',
    body: 'Renderers resolve a sheet to inline styles for HTML email or to a PDF style profile. Unsupported declarations fail explicitly.',
    topic: 'renderers',
    link: 'Web, email and PDF',
  },
  {
    title: 'Tailwind backend',
    body: 'Resolve fields to utilities from your own Tailwind build, validated against the declarations they emit.',
    topic: 'backends',
    link: 'Backend integrations',
  },
  {
    title: 'Editor and lint tooling',
    body: 'A language server and VS Code extension add token completion and source navigation. Lint rules run in ESLint and Oxlint.',
    topic: 'compiler',
    link: 'Compiler and language server',
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

function Capabilities() {
  const s = useStyles(homeStyles)
  return (
    <section {...s.Section} id="capabilities" aria-labelledby="caps-title">
      <div {...s.SectionIntro}>
        <p {...s.Eyebrow}>What it gives you</p>
        <h2 id="caps-title" {...s.Heading}>
          Capabilities
        </h2>
        <p {...s.Body}>
          Each one links to its documentation, which also states its limits.
        </p>
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
    body: 'Edit a system, a stylesheet and a component in the browser, with type checking.',
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
                Typed styling, independent of platform and framework
              </h1>
              <p {...s.Lead}>
                Toned is a styling system. You define a typed vocabulary of
                design tokens, name the parts of a component and declare its
                variants. The core has no framework dependency and compiles
                those declarations for each target: web CSS, React Native, HTML
                email and PDF. The React binding ships today.
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
            <ThemeDemo />
          </div>
          <div {...s.Band}>
            <div {...s.Container}>
              <HowItWorks />
            </div>
          </div>
          <div {...s.Container}>
            <Capabilities />
            <WhereNext />
          </div>
        </main>
        <SiteFooter />
      </div>
    </ThemeScope>
  )
}
