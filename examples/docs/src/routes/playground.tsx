import { createFileRoute, Link } from '@tanstack/react-router'
import { useStyles } from '@toned/react'
import { SiteHeader } from '../components/SiteHeader.tsx'
import { SourcePanel } from '../components/SourcePanel.tsx'
import { StyleStudio } from '../components/StyleStudio.tsx'
import { LayoutExplorer, TokenMap } from '../components/Visualisations.tsx'
import { homeStyles } from '../styles/home.ts'
import '../styles/home.css'

export const Route = createFileRoute('/playground')({ component: Playground })

function Playground() {
  const s = useStyles(homeStyles)
  return (
    <div {...s.Page.withProps({ className: 'tnd-home' })}>
      <a className="tnd-skip-link" href="#main">
        Skip to content
      </a>
      <div {...s.Container}>
        <SiteHeader />
        <main id="main" {...s.Section}>
          <div {...s.SectionIntro}>
            <h1 {...s.Heading}>
              A little change.
              <br />A whole different feel.
            </h1>
            <p {...s.Body}>
              Change the tone, shape, density, and theme. Every control updates
              a typed variant in the real stylesheet below.
            </p>
            <p {...s.FeatureBody}>
              Try saving the idea, then changing its style. The component keeps
              its state.
            </p>
          </div>
          <StyleStudio />
          <SourcePanel />
          <TokenMap />
          <LayoutExplorer />
          <div {...s.Banner}>
            <div {...s.SectionIntro}>
              <h2 {...s.BannerTitle}>Now make something yours.</h2>
              <p {...s.BannerText}>
                Follow the setup guide, or explore more components in the
                gallery.
              </p>
            </div>
            <div {...s.Actions}>
              <Link to="/getting-started" {...s.BannerLink}>
                Start building
              </Link>
              <Link to="/ui">Component gallery</Link>
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}
