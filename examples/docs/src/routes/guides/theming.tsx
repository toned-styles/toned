import { createFileRoute, Link } from '@tanstack/react-router'
import { useStyles } from '@toned/react'

import { CodeBlock } from '../../components/CodeBlock.tsx'
import { proseStyles } from '../../styles/prose.ts'

export const Route = createFileRoute('/guides/theming')({
  component: GuideTheming,
})

function GuideTheming() {
  const s = useStyles(proseStyles)
  return (
    <article {...s.container}>
      <h1 {...s.h1}>Theming Guide</h1>
      <p>
        A stylesheet names roles such as{' '}
        <code {...s.code}>fill: 'surface'</code>; a theme supplies the values
        behind them. Declare the themes on the system, and on the web the build
        writes them as CSS custom properties. A stylesheet never names a theme.
      </p>
      <p>
        The <Link to="/themes">theme showcase</Link> renders one interface in
        six themes built this way.
      </p>

      <h2 {...s.h2} id="use-a-theme-in-a-stylesheet">
        Use a theme in a stylesheet
      </h2>
      <p>
        Nothing in a sheet refers to a theme. It uses the system's tokens, and
        the tokens read the theme.
      </p>
      <CodeBlock title="styles.ts">{`import { stylesheet } from './system.ts'

export const panelStyles = stylesheet({
  Root: { fill: 'surface', ink: 'default', radius: 'panel', padding: 'panel' },
  Title: { $kind: 'text', ink: 'accent' },
})`}</CodeBlock>

      <h2 {...s.h2} id="switch-theme">
        Switch theme
      </h2>
      <p>
        The first declared theme applies everywhere. To use another one, set{' '}
        <code {...s.code}>data-theme</code> on any element; it applies to that
        element and everything inside it, and scopes can nest. Changing the
        attribute changes no class and no inline style, so a theme can be
        switched without Toned doing any work.
      </p>
      <CodeBlock title="Panel.tsx">{`import { createElements } from '@toned/react'
import { panelStyles } from './styles.ts'

const S = createElements(panelStyles)

export function Panel({ theme, title }: {
  theme?: 'day' | 'night'
  title: string
}) {
  return (
    <S>
      <S.Root data-theme={theme}>
        <S.Title as="h2">{title}</S.Title>
      </S.Root>
    </S>
  )
}`}</CodeBlock>
      <p>
        For a whole page, put the attribute on the{' '}
        <code {...s.code}>{'<html>'}</code> element. To follow the operating
        system, set it from a <code {...s.code}>prefers-color-scheme</code>{' '}
        media query listener before the first paint.
      </p>

      <h2 {...s.h2} id="declare-themes">
        Declare the themes
      </h2>
      <p>
        A theme schema is a type: the fields every theme must supply.{' '}
        <code {...s.code}>defineTokenFor</code> binds tokens to it, so a
        resolver can read only those fields, and{' '}
        <code {...s.code}>defineSystem</code> checks each entry of{' '}
        <code {...s.code}>themes</code> against it. A theme that lacks a field
        does not compile.
      </p>
      <CodeBlock title="system.ts">{`import { defineSystem, defineTokenFor } from '@toned/core'

// What every theme supplies. Each field is a CSS value.
export type Theme = {
  surface: string
  ink: string
  accent: string
  radius: string
  padding: string
}

const token = defineTokenFor<Theme>()

export const ui = defineSystem({
  id: 'app',
  tokens: {
    fill: token({
      values: ['surface', 'accent'],
      resolve: (value, theme) => ({
        backgroundColor: value === 'accent' ? theme.accent : theme.surface,
      }),
    }),
    ink: token({
      values: ['default', 'accent'],
      resolve: (value, theme) => ({
        color: value === 'accent' ? theme.accent : theme.ink,
      }),
    }),
    radius: token({
      values: ['panel'],
      resolve: (_value, theme) => ({ borderRadius: theme.radius }),
    }),
    padding: token({
      values: ['panel'],
      resolve: (_value, theme) => ({ padding: theme.padding }),
    }),
  },
  themes: {
    day: { surface: '#ffffff', ink: '#17234b', accent: '#284bdd', radius: '8px', padding: '16px' },
    night: { surface: '#10162f', ink: '#e8edff', accent: '#8fa5ff', radius: '12px', padding: '20px' },
  },
})

export const { stylesheet } = ui`}</CodeBlock>

      <h2 {...s.h2} id="what-the-build-writes">
        What the build writes
      </h2>
      <p>
        <code {...s.code}>buildStyles</code> and the Vite plugin add the themes
        to the stylesheet they generate. A resolver's{' '}
        <code {...s.code}>theme.surface</code> becomes{' '}
        <code {...s.code}>var(--app-surface)</code> in a generated class, and
        each theme sets those properties: the first one on{' '}
        <code {...s.code}>:root</code>, and every one under its{' '}
        <code {...s.code}>data-theme</code> selector.
      </p>
      <CodeBlock lang="css">{`:root { --app-surface: #ffffff; --app-ink: #17234b; --app-accent: #284bdd; --app-radius: 8px; --app-padding: 16px; }
[data-theme='day'] { --app-surface: #ffffff; --app-ink: #17234b; --app-accent: #284bdd; --app-radius: 8px; --app-padding: 16px; }
[data-theme='night'] { --app-surface: #10162f; --app-ink: #e8edff; --app-accent: #8fa5ff; --app-radius: 12px; --app-padding: 20px; }

.app--fill_surface { background-color: var(--app-surface); }`}</CodeBlock>
      <p>
        The <code {...s.code}>themes</code> option chooses another default, or
        leaves the themes out so that the application can deliver them itself.{' '}
        <code {...s.code}>generateThemes</code> returns the theme CSS alone.
      </p>
      <CodeBlock title="build.ts">{`import { buildStyles, generateThemes } from '@toned/core/build'
import { panelStyles } from './styles.ts'
import { ui } from './system.ts'

const sheets = [panelStyles]

// Classes and themes; 'day' is the default because it is declared first.
export const artifact = buildStyles(ui, { sheets })

// 'night' on :root instead.
export const nightFirst = buildStyles(ui, { sheets, themes: { default: 'night' } })

// Classes only, and the themes as a separate stylesheet.
export const classesOnly = buildStyles(ui, { sheets, themes: false })
export const themeCss = generateThemes(ui)`}</CodeBlock>

      <h2 {...s.h2} id="limits">
        Limits
      </h2>
      <p>
        Only top-level string and number fields of a theme are written. A nested
        group such as <code {...s.code}>colors.primary</code> cannot be read
        through one custom property; keep the schema flat, or pass those values
        to a renderer as explicit tokens.
      </p>
      <p>
        A generated class sets each side of a box separately. A field read by{' '}
        <code {...s.code}>padding</code>, <code {...s.code}>margin</code>,{' '}
        <code {...s.code}>inset</code> or <code {...s.code}>borderWidth</code>{' '}
        must therefore hold one value: the build refuses{' '}
        <code {...s.code}>3px 0 0 0</code> there. Use one field per side.
      </p>
      <p>
        On React Native there are no custom properties. Give the renderer
        concrete token values, and pass a changed set through the provider's{' '}
        <code {...s.code}>theme</code> prop; see the{' '}
        <Link
          to="/learn/$topic"
          params={{ topic: 'react' }}
          hash="explicit-renderer-configuration"
        >
          React reference
        </Link>
        .
      </p>

      <h2 {...s.h2} id="base-system-themes">
        Themes for the base system
      </h2>
      <p>
        The optional base system in <code {...s.code}>@toned/systems</code>{' '}
        reads custom properties with fixed names, and{' '}
        <code {...s.code}>@toned/themes</code> ships values for them. Import the
        theme's stylesheet once:
      </p>
      <CodeBlock title="toned.config.ts">{`import '@toned/themes/shadcn/config.css'`}</CodeBlock>
      <p>The file sets one property per token value:</p>
      <CodeBlock>{`/* @toned/themes/shadcn/config.css (simplified) */
:root {
  --colors_bg_default: hsl(0 0% 100%);
  --colors_text_default: hsl(222.2 84% 4.9%);
  --colors_bg_action: hsl(222.2 47.4% 11.2%);
  --colors_text_on_action: hsl(210 40% 98%);
  --colors_bg_muted: hsl(210 40% 96.1%);
  --radius_small: 4px;
  --radius_medium: 6px;
  --radius_large: 8px;
  /* ... */
}`}</CodeBlock>

      <h3 {...s.h3} id="dark-mode">
        Dark mode
      </h3>
      <p>
        The shadcn theme includes dark values under a{' '}
        <code {...s.code}>.dark</code> class. Add or remove the class on the{' '}
        <code {...s.code}>{'<html>'}</code> element; the stylesheets do not
        change.
      </p>
      <CodeBlock>{`/* Dark mode overrides */
.dark {
  --colors_bg_default: hsl(222.2 84% 4.9%);
  --colors_text_default: hsl(210 40% 98%);
  --colors_bg_action: hsl(210 40% 98%);
  --colors_text_on_action: hsl(222.2 47.4% 11.2%);
  /* ... */
}`}</CodeBlock>

      <h3 {...s.h3} id="custom-themes">
        A custom theme
      </h3>
      <p>
        To theme the base system yourself, write a stylesheet that sets the same
        properties and import it in place of the packaged one:
      </p>
      <CodeBlock>{`/* my-theme.css */
:root {
  /* Colour tokens */
  --colors_bg_default: hsl(0 0% 98%);
  --colors_text_default: hsl(240 10% 10%);
  --colors_bg_action: hsl(220 90% 56%);
  --colors_text_on_action: hsl(0 0% 100%);
  --colors_bg_muted: hsl(220 14% 96%);
  --colors_bg_elevated: hsl(0 0% 100%);
  --colors_border_subtle: hsl(220 13% 91%);

  /* Border radius tokens */
  --radius_small: 3px;
  --radius_medium: 5px;
  --radius_large: 10px;
  --radius_full: 9999px;

  /* Shadow tokens */
  --shadow_small: 0 1px 3px rgba(0,0,0,0.1);
  --shadow_medium: 0 4px 12px rgba(0,0,0,0.1);
}`}</CodeBlock>
    </article>
  )
}
