import { Link } from '@tanstack/react-router'
import { useStyles } from '@toned/react'
import { useState } from 'react'
import { homeStyles } from '../../styles/home.ts'
import {
  defaultTheme,
  type ThemeName,
  themeList,
} from '../../styles/themes/themes.ts'
import { ReleaseApp } from '../themes/ReleaseApp.tsx'
import { ThemeSwitcher } from '../themes/ThemeSwitcher.tsx'

const facts = [
  {
    title: 'Written once',
    body: 'The stylesheets name roles such as fill: ‘accent’. None of them names a theme.',
  },
  {
    title: 'A theme is one typed object',
    body: 'Every theme satisfies the same type, so a missing or unknown field does not compile.',
  },
  {
    title: 'Switching is CSS only',
    body: 'Choosing a theme sets one data-theme attribute. No component rerenders and no class changes.',
  },
] as const

/** The theme showcase's interface, with its switcher. Needs a `ThemeScope`. */
export function ThemeDemo() {
  const s = useStyles(homeStyles)
  const [theme, setTheme] = useState<ThemeName>(defaultTheme)
  return (
    <section {...s.Section} id="themes" aria-labelledby="themes-title">
      <div {...s.SectionIntro}>
        <p {...s.Eyebrow}>Themes</p>
        <h2 id="themes-title" {...s.Heading}>
          One interface, {themeList.length} themes
        </h2>
        <p {...s.Body}>
          This release dashboard is one set of components and stylesheets. Pick
          a theme: colour, type, borders, corners, shadows and window chrome all
          change, and the code does not.
        </p>
      </div>
      <div {...s.ThemeDemo}>
        <ThemeSwitcher value={theme} onChange={setTheme} />
        <section
          {...s.ThemeFrame}
          aria-label="Themed interface"
          // biome-ignore lint/a11y/noNoninteractiveTabindex: the frame scrolls on small screens, so keyboard users must reach it.
          tabIndex={0}
        >
          <ReleaseApp theme={theme} />
        </section>
      </div>
      <div {...s.Facts}>
        {facts.map((fact) => (
          <div key={fact.title} {...s.Fact}>
            <h3 {...s.FactTitle}>{fact.title}</h3>
            <p {...s.FactBody}>{fact.body}</p>
          </div>
        ))}
      </div>
      <Link to="/themes" {...s.TextLink}>
        See the themes and their source
      </Link>
    </section>
  )
}
