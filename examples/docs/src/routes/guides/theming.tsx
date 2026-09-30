import { createFileRoute } from '@tanstack/react-router'
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
        toned-styles separates token definitions from token values. Your
        stylesheets reference semantic names like{' '}
        <code {...s.code}>'action'</code> or <code {...s.code}>'elevated'</code>
        , and a theme provides the concrete values behind those names.
      </p>

      <p>
        This page covers CSS themes for the optional base system. For typed
        theme schemas, palettes and provider-scoped values, read the{' '}
        <a href="/learn/core">system reference</a> and{' '}
        <a href="/learn/react">React reference</a>.
      </p>
      <h2 {...s.h2} id="how-theming-works">
        How Theming Works
      </h2>
      <p>
        On the web, themes are implemented as CSS custom properties. The build
        pipeline generates CSS rules that reference these properties. A theme
        CSS file sets the property values:
      </p>
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

      <h2 {...s.h2} id="using-a-built-in-theme">
        Using a Built-in Theme
      </h2>
      <p>
        The simplest way to theme your app is to import one of the pre-built
        theme CSS files in your config:
      </p>
      <CodeBlock>{`// toned.config.ts
import '@toned/themes/shadcn/config.css'
// ... rest of config`}</CodeBlock>

      <h2 {...s.h2} id="dark-mode">
        Dark Mode
      </h2>
      <p>
        Themes can provide dark mode overrides using a CSS class or media query.
        The shadcn theme supports dark mode via a <code {...s.code}>.dark</code>{' '}
        class on the root element:
      </p>
      <CodeBlock>{`/* Dark mode overrides */
.dark {
  --colors_bg_default: hsl(222.2 84% 4.9%);
  --colors_text_default: hsl(210 40% 98%);
  --colors_bg_action: hsl(210 40% 98%);
  --colors_text_on_action: hsl(222.2 47.4% 11.2%);
  /* ... */
}`}</CodeBlock>
      <p>
        Toggle dark mode by adding or removing the <code {...s.code}>dark</code>{' '}
        class on your <code {...s.code}>{'<html>'}</code> or{' '}
        <code {...s.code}>{'<body>'}</code> element. No changes to your
        stylesheets are needed -- the same semantic token names resolve to
        different values automatically.
      </p>

      <h2 {...s.h2} id="custom-themes">
        Custom Themes
      </h2>
      <p>
        To create a custom theme, define a CSS file that sets values for all the
        custom properties your system's tokens reference. The property names
        follow the pattern used by your token definitions:
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
      <p>Then import your custom theme instead of the built-in one:</p>
      <CodeBlock>{`// toned.config.ts
import './my-theme.css'  // your custom theme
// Configure the explicit renderer/provider as in Getting Started.`}</CodeBlock>

      <h2 {...s.h2} id="runtime-theme-switching">
        Runtime Theme Switching
      </h2>
      <p>
        Since themes are CSS custom properties, you can switch themes at runtime
        by swapping a class on the document root or by dynamically updating the
        custom property values:
      </p>
      <CodeBlock>{`// Switch between themes by toggling a class
document.documentElement.classList.toggle('theme-blue')
document.documentElement.classList.toggle('theme-green')`}</CodeBlock>
    </article>
  )
}
