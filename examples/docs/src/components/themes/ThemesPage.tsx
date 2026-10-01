import { useStyles } from '@toned/react'
import { useEffect, useState } from 'react'
import { proseStyles } from '../../styles/prose.ts'
import { docsStyles } from '../../styles/site.ts'
import { themesPageStyles } from '../../styles/themes/page.ts'
import buttonSource from '../../styles/themes/sheets/button.ts?raw'
import systemSource from '../../styles/themes/system.ts?raw'
import schemaSource from '../../styles/themes/theme.ts?raw'
import {
  defaultTheme,
  type ThemeName,
  themeList,
  themes,
} from '../../styles/themes/themes.ts'
import themesSource from '../../styles/themes/themes.ts?raw'
import tokensSource from '../../styles/themes/tokens.ts?raw'
import { CodeBlock } from '../CodeBlock.tsx'
import { SiteHeader } from '../SiteHeader.tsx'
import { SiteFooter } from '../site/SiteFooter.tsx'
import controlsSource from './controls.tsx?raw'
import { ReleaseApp } from './ReleaseApp.tsx'
import { ThemeScope } from './ThemeScope.tsx'
import { ThemeSwitcher } from './ThemeSwitcher.tsx'
import { ThemeValues } from './ThemeValues.tsx'

const storageKey = 'toned-docs-theme'

/** The Button component, cut out of the module that defines every control. */
const buttonComponent = [
  "import { createElements } from '@toned/react'",
  "import { buttonStyles } from './sheets/button.ts'",
  '',
  'const ButtonParts = createElements(buttonStyles)',
  '',
  controlsSource.slice(
    controlsSource.indexOf('export function Button('),
    controlsSource.indexOf('export function Badge('),
  ),
].join('\n')

export function ThemesPage() {
  const page = useStyles(docsStyles)
  const prose = useStyles(proseStyles)
  const s = useStyles(themesPageStyles, { selected: false })
  // The server renders the default theme; a remembered choice applies after
  // hydration, so the first client render matches the server's.
  const [theme, setTheme] = useState<ThemeName>(defaultTheme)
  useEffect(() => {
    try {
      const saved = sessionStorage.getItem(storageKey)
      if (saved && saved in themes) setTheme(saved as ThemeName)
    } catch {
      // Storage can be unavailable; the default theme stays.
    }
  }, [])

  function choose(next: ThemeName) {
    setTheme(next)
    try {
      sessionStorage.setItem(storageKey, next)
    } catch {
      // The choice still applies for this visit.
    }
  }

  return (
    <ThemeScope>
      <div {...page.Page}>
        <a href="#themes-main" className="tnd-skip-link">
          Skip to content
        </a>
        <SiteHeader />
        <main id="themes-main" tabIndex={-1} {...s.Main}>
          <div {...s.Intro}>
            <h1 {...prose.h1}>Themes</h1>
            <p {...s.Lead}>
              One interface, written once against a typed token vocabulary, and{' '}
              {themeList.length} themes that supply different values for it.
              Switching theme changes one attribute on the root element. It is
              CSS only: no component rerenders for it, and no class or inline
              style changes.
            </p>
          </div>

          <section {...s.Demo} aria-label="Theme demo">
            <ThemeSwitcher value={theme} onChange={choose} />
            <div {...s.Frame}>
              <ReleaseApp theme={theme} />
            </div>
          </section>

          <section {...s.Section} aria-labelledby="how-it-works">
            <h2 {...s.Heading} id="how-it-works">
              How it is built
            </h2>
            <p {...s.Copy}>
              Stylesheets name roles such as{' '}
              <code {...prose.code}>fill: 'accent'</code> or{' '}
              <code {...prose.code}>edge: 'panel'</code>. Each token resolves a
              role from the active theme, and a theme is an object that
              satisfies one type. On the web every theme field is a custom
              property, so the generated classes stay the same and only the
              values under <code {...prose.code}>data-theme</code> differ.
            </p>
            <div {...s.Layers}>
              <div {...s.Layer}>
                <h3 {...s.LayerTitle}>1. A stylesheet</h3>
                <p {...s.LayerNote}>
                  The button used throughout the demo. It is the same in every
                  theme.
                </p>
                <CodeBlock title="sheets/button.ts" lang="ts" maxHeight={420}>
                  {buttonSource}
                </CodeBlock>
                <CodeBlock title="Button.tsx" lang="tsx" maxHeight={300}>
                  {buttonComponent}
                </CodeBlock>
              </div>
              <div {...s.Layer}>
                <h3 {...s.LayerTitle}>2. The themes</h3>
                <ThemeValues theme={theme} />
                <CodeBlock title="themes.ts" lang="ts" maxHeight={420}>
                  {themesSource}
                </CodeBlock>
              </div>
              <div {...s.Layer}>
                <h3 {...s.LayerTitle}>3. The theme schema and the system</h3>
                <p {...s.LayerNote}>
                  The type every theme satisfies, and the system that checks the
                  themes against it and emits them as CSS.
                </p>
                <CodeBlock title="theme.ts" lang="ts" maxHeight={420}>
                  {schemaSource}
                </CodeBlock>
                <CodeBlock title="system.ts" lang="ts" maxHeight={420}>
                  {systemSource}
                </CodeBlock>
              </div>
              <div {...s.Layer}>
                <h3 {...s.LayerTitle}>4. The tokens</h3>
                <p {...s.LayerNote}>
                  Each resolver turns a role into styles by reading the theme.
                  Structural differences are tokens too: a theme decides whether
                  the window has a title bar.
                </p>
                <CodeBlock title="tokens.ts" lang="ts" maxHeight={900}>
                  {tokensSource}
                </CodeBlock>
              </div>
            </div>
          </section>
        </main>
        <SiteFooter />
      </div>
    </ThemeScope>
  )
}
