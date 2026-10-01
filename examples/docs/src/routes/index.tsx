import { createFileRoute, Link } from '@tanstack/react-router'
import { useStyles } from '@toned/react'
import { CodeBlock } from '../components/CodeBlock.tsx'
import { SiteHeader } from '../components/SiteHeader.tsx'
import { StyleStudio } from '../components/StyleStudio.tsx'
import { SiteFooter } from '../components/site/SiteFooter.tsx'
import { LayoutExplorer, TokenMap } from '../components/Visualisations.tsx'
import { homeStyles } from '../styles/home.ts'
import showcaseSource from '../styles/showcase.ts?raw'
import '../styles/home.css'

export const Route = createFileRoute('/')({ component: Home })

const features = [
  {
    glyph: '{ }',
    title: 'Typed design tokens',
    body: 'Define the tokens your product uses: colours, spacing, typography, or your own. TypeScript rejects values that are not in a token.',
    href: '/api/define-system',
    link: 'defineSystem reference',
  },
  {
    glyph: '↳',
    title: 'Named parts',
    body: 'A stylesheet names the parts of a component and styles them together. Variants are scoped by a provider that adds no wrapper element.',
    href: '/api/use-styles',
    link: 'useStyles reference',
  },
  {
    glyph: '⌘',
    title: 'Variants',
    body: 'Declare sizes, tones, states and their combinations in the stylesheet. Selectors chain, so there are no class strings to assemble.',
    href: '/api/variants',
    link: 'variants reference',
  },
] as const

function Features() {
  const s = useStyles(homeStyles)
  return (
    <section {...s.Section} id="features" aria-labelledby="features-title">
      <div {...s.SectionIntro}>
        <h2 id="features-title" {...s.Heading}>
          What a stylesheet contains
        </h2>
        <p {...s.Body}>
          Three ideas cover most of the library: tokens, named parts and
          variants.
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
              The studio’s source
            </h2>
            <p {...s.Body}>
              This is the variant definition the studio above runs. One axis can
              change several named parts.
            </p>
            <div {...s.Steps}>
              <div {...s.Step}>
                <span {...s.StepNumber}>1</span>
                <div>
                  <h3 {...s.FeatureHeading}>Define tokens</h3>
                  <p {...s.FeatureBody}>
                    Use your own tokens or the optional base system.
                  </p>
                </div>
              </div>
              <div {...s.Step}>
                <span {...s.StepNumber}>2</span>
                <div>
                  <h3 {...s.FeatureHeading}>Declare parts and variants</h3>
                  <p {...s.FeatureBody}>
                    Keep a component’s style rules in one pure module.
                  </p>
                </div>
              </div>
              <div {...s.Step}>
                <span {...s.StepNumber}>3</span>
                <div>
                  <h3 {...s.FeatureHeading}>Build and render</h3>
                  <p {...s.FeatureBody}>
                    Web CSS is generated at build time. Bind the parts to your
                    components.
                  </p>
                </div>
              </div>
            </div>
            <Link to="/getting-started" {...s.TextLink}>
              Getting started guide
            </Link>
          </div>
          <div {...s.Source}>
            <CodeBlock
              title="showcase.ts — live demo source"
              bare
              maxHeight={420}
            >
              {showcaseSource.slice(
                Math.max(0, showcaseSource.indexOf('.variants(')),
              )}
            </CodeBlock>
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
          Beyond the basics
        </h2>
        <p {...s.Body}>
          Conditions, platforms and tooling, each documented with its limits.
        </p>
      </div>
      <div {...s.Features}>
        <div {...s.Feature}>
          <h3 {...s.FeatureHeading}>Conditions</h3>
          <p {...s.FeatureBody}>
            Media queries, container queries and interaction states share one
            typed condition model, so a layout can respond to the container a
            component is in.
          </p>
          <Link to="/api/media-queries" {...s.TextLink}>
            Media queries reference
          </Link>
        </div>
        <div {...s.Feature}>
          <h3 {...s.FeatureHeading}>Web and React Native</h3>
          <p {...s.FeatureBody}>
            Share declarations across web and native host integrations, with
            explicit platform boundaries. Native support is verified per host;
            native grid is not supported.
          </p>
          <Link to="/guides/react-native" {...s.TextLink}>
            React Native guide
          </Link>
        </div>
        <div {...s.Feature}>
          <h3 {...s.FeatureHeading}>Tooling</h3>
          <p {...s.FeatureBody}>
            Optional tools cover source navigation, a browser inspector,
            measured contracts and design-token interchange. Adaptive layout and
            motion are separate opt-in APIs.
          </p>
          <Link to="/explore" {...s.TextLink}>
            All capabilities
          </Link>
        </div>
      </div>
      <div {...s.Banner}>
        <div {...s.SectionIntro}>
          <h3 {...s.BannerTitle}>Capability lab</h3>
          <p {...s.BannerText}>
            Seven working demos: adaptive layouts, motion, grid, document
            renderers, token exchange, contracts and source inspection.
          </p>
        </div>
        <Link to="/lab" {...s.BannerLink}>
          Open the lab
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
      <SiteHeader />
      <main id="main">
        <div {...s.Container}>
          <section {...s.Hero} aria-labelledby="hero-title">
            <p {...s.Note}>Open source · MIT licensed</p>
            <h1 id="hero-title" {...s.Title}>
              Typed styling for React and React Native
            </h1>
            <p {...s.Lead}>
              Define design tokens, name the parts of a component and declare
              its variants in one typed stylesheet.
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
      <SiteFooter />
    </div>
  )
}
