import { createFileRoute, Link } from '@tanstack/react-router'
import { useStyles } from '@toned/react'
import { SiteHeader } from '../components/SiteHeader.tsx'
import { StyleStudio } from '../components/StyleStudio.tsx'
import { LayoutExplorer, TokenMap } from '../components/Visualisations.tsx'
import { homeStyles } from '../styles/home.ts'
import showcaseSource from '../styles/showcase.ts?raw'
import '../styles/home.css'

export const Route = createFileRoute('/')({ component: Home })

const features = [
  {
    glyph: '{ }',
    title: 'A vocabulary that’s yours.',
    body: 'Define the tokens your product speaks. Colours, spacing, typography, or something entirely your own. TypeScript keeps every value in bounds.',
    href: '/api/define-system',
    link: 'Explore design systems',
  },
  {
    glyph: '↳',
    title: 'Parts that belong together.',
    body: 'Name the pieces of a component. Style them together, compose them freely, and scope their variants with a provider that adds no wrapper element.',
    href: '/api/use-styles',
    link: 'Meet element families',
  },
  {
    glyph: '⌘',
    title: 'Every combination, considered.',
    body: 'Express sizes, tones, states, and their intersections in one stylesheet. Chain variant selectors without assembling class strings.',
    href: '/api/variants',
    link: 'Compose variants',
  },
] as const

function Features() {
  const s = useStyles(homeStyles)
  return (
    <section {...s.Section} id="features" aria-labelledby="features-title">
      <div {...s.SectionIntro}>
        <h2 id="features-title" {...s.Heading}>
          A system for your style.
          <br />
          Room for your ideas.
        </h2>
        <p {...s.Body}>
          Bring structure to the things you repeat, and freedom to the things
          that make your interface yours.
        </p>
      </div>
      <div {...s.Features}>
        {features.map((feature) => (
          <div key={feature.title} {...s.Feature}>
            <div {...s.FeatureIcon} aria-hidden="true">
              {feature.glyph}
            </div>
            <h3 {...s.FeatureHeading}>{feature.title}</h3>
            <p {...s.FeatureBody}>{feature.body}</p>
            <Link to={feature.href} {...s.TextLink}>
              {feature.link}
            </Link>
          </div>
        ))}
      </div>
    </section>
  )
}

function SourceSection() {
  const s = useStyles(homeStyles)
  return (
    <section id="source" aria-labelledby="source-title" {...s.SourceSection}>
      <div {...s.Container}>
        <div {...s.SourceGrid}>
          <div {...s.SectionIntro}>
            <h2 id="source-title" {...s.Heading}>
              The design is
              <br />
              in the declaration.
            </h2>
            <p {...s.Body}>
              This is the actual variant definition powering the studio above. A
              change to one axis can reach every named part.
            </p>
            <div {...s.Steps}>
              <div {...s.Step}>
                <span {...s.StepNumber}>1</span>
                <div>
                  <h3 {...s.FeatureHeading}>Define your vocabulary</h3>
                  <p {...s.FeatureBody}>
                    Start with your own tokens or the optional base system.
                  </p>
                </div>
              </div>
              <div {...s.Step}>
                <span {...s.StepNumber}>2</span>
                <div>
                  <h3 {...s.FeatureHeading}>Declare parts and variants</h3>
                  <p {...s.FeatureBody}>
                    Keep the visual rules together in a pure module.
                  </p>
                </div>
              </div>
              <div {...s.Step}>
                <span {...s.StepNumber}>3</span>
                <div>
                  <h3 {...s.FeatureHeading}>Build, then render</h3>
                  <p {...s.FeatureBody}>
                    Generate web CSS ahead of time. Bind the parts to your
                    components.
                  </p>
                </div>
              </div>
            </div>
            <Link to="/getting-started" {...s.TextLink}>
              Walk through your first component
            </Link>
          </div>
          <div {...s.Source}>
            <div {...s.StudioBar}>
              <span>showcase.ts</span>
              <span {...s.Muted}>Live demo source</span>
            </div>
            <pre
              {...s.SourceScroll}
              // biome-ignore lint/a11y/noNoninteractiveTabindex: keyboard users must be able to scroll the code region.
              tabIndex={0}
              role="region"
              aria-label="Studio variant source"
            >
              <code>
                {showcaseSource.slice(
                  Math.max(0, showcaseSource.indexOf('.variants(')),
                )}
              </code>
            </pre>
          </div>
        </div>
      </div>
    </section>
  )
}

function Beyond() {
  const s = useStyles(homeStyles)
  return (
    <section {...s.Section} aria-labelledby="beyond-title">
      <div {...s.SectionIntro}>
        <h2 id="beyond-title" {...s.Heading}>
          Good style goes further.
        </h2>
        <p {...s.Body}>
          From the first button to a whole design system, Toned keeps the rules
          connected.
        </p>
      </div>
      <div {...s.Features}>
        <div {...s.Feature}>
          <h3 {...s.FeatureHeading}>Respond to more than width.</h3>
          <p {...s.FeatureBody}>
            Media queries, containers, and interaction states share a typed
            condition model. Build layouts that respond to where a component
            lives.
          </p>
          <Link to="/api/media-queries" {...s.TextLink}>
            Explore conditions
          </Link>
        </div>
        <div {...s.Feature}>
          <h3 {...s.FeatureHeading}>Web today. Native, explicitly.</h3>
          <p {...s.FeatureBody}>
            Share declarations across web and native host integrations, with
            explicit platform boundaries. Native support is verified per host;
            native grid is not supported.
          </p>
          <Link to="/guides/react-native" {...s.TextLink}>
            Understand native support
          </Link>
        </div>
        <div {...s.Feature}>
          <h3 {...s.FeatureHeading}>A design system you can inspect.</h3>
          <p {...s.FeatureBody}>
            Optional tooling connects source navigation, a browser inspector,
            measured contracts, and design-token interchange. Adaptive layout
            and motion have dedicated opt-in APIs.
          </p>
          <Link to="/explore" {...s.TextLink}>
            Explore every capability
          </Link>
        </div>
      </div>
      <div {...s.Banner}>
        <div {...s.SectionIntro}>
          <h3 {...s.BannerTitle}>
            Less imagining.
            <br />
            More trying things.
          </h3>
          <p {...s.BannerText}>
            Try seven working experiments: adaptive layouts, motion, grid,
            document renderers, token exchange, contracts and source inspection.
          </p>
        </div>
        <Link to="/lab" {...s.BannerLink}>
          Enter the capability lab
        </Link>
      </div>
    </section>
  )
}

function Home() {
  const s = useStyles(homeStyles)
  return (
    <div {...s.Page.withProps({ className: 'tnd-home' })}>
      <a className="tnd-skip-link" href="#main">
        Skip to content
      </a>
      <div {...s.Container}>
        <SiteHeader />
      </div>
      <main id="main">
        <div {...s.Container}>
          <section {...s.Hero} aria-labelledby="hero-title">
            <p {...s.Note}>Open source styling for React & React Native</p>
            <h1 id="hero-title" {...s.Title}>
              Make it yours.
              <br />
              Keep it together.
            </h1>
            <p {...s.Lead}>
              The typed styling library for React and React Native. Your tokens,
              expressive variants, and beautifully connected components.
            </p>
            <div {...s.Actions}>
              <Link to="/getting-started" {...s.Primary}>
                Start building
              </Link>
              <Link to="/playground" {...s.Secondary}>
                Open the playground
              </Link>
            </div>
          </section>
          <StyleStudio />
          <TokenMap />
          <Features />
        </div>
        <SourceSection />
        <div {...s.Container}>
          <LayoutExplorer />
          <Beyond />
        </div>
      </main>
      <div {...s.Container}>
        <footer {...s.Footer}>
          <Link to="/" {...s.Logo}>
            <img
              src="/brand/toned-logo.svg"
              width="130"
              height="32"
              alt="Toned"
            />
          </Link>
          <p>Made for the details. Open source, MIT licensed.</p>
          <div {...s.FooterLinks}>
            <Link to="/getting-started">Documentation</Link>
            <a href="https://github.com/toned-styles/toned">Source code</a>
          </div>
        </footer>
      </div>
    </div>
  )
}
