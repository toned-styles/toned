import { useStyles } from '@toned/react'
import { CodeBlock } from '../../components/CodeBlock.tsx'
import { proseStyles } from '../../styles/prose.ts'

export function GuideTheming() {
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

      <h2 {...s.h2}>How Theming Works</h2>
      <p>
        On the web, themes are implemented as CSS custom properties. The{' '}
        <code {...s.code}>inject(system)</code> call generates CSS rules that
        reference these properties. A theme CSS file sets the property values:
      </p>
      <CodeBlock>{`/* @toned/themes/shadcn/config.css (simplified) */
:root {
  --color-background: 0 0% 100%;
  --color-foreground: 222.2 84% 4.9%;
  --color-action: 222.2 47.4% 11.2%;
  --color-on-action: 210 40% 98%;
  --color-muted: 210 40% 96.1%;
  --radius-small: 4px;
  --radius-medium: 6px;
  --radius-large: 8px;
  /* ... */
}`}</CodeBlock>

      <h2 {...s.h2}>Using a Built-in Theme</h2>
      <p>
        The simplest way to theme your app is to import one of the pre-built
        theme CSS files in your config:
      </p>
      <CodeBlock>{`// toned.config.ts
import '@toned/themes/shadcn/config.css'
// ... rest of config`}</CodeBlock>

      <h2 {...s.h2}>Dark Mode</h2>
      <p>
        Themes can provide dark mode overrides using a CSS class or media query.
        The shadcn theme supports dark mode via a <code {...s.code}>.dark</code>{' '}
        class on the root element:
      </p>
      <CodeBlock>{`/* Dark mode overrides */
.dark {
  --color-background: 222.2 84% 4.9%;
  --color-foreground: 210 40% 98%;
  --color-action: 210 40% 98%;
  --color-on-action: 222.2 47.4% 11.2%;
  /* ... */
}`}</CodeBlock>
      <p>
        Toggle dark mode by adding or removing the <code {...s.code}>dark</code>{' '}
        class on your <code {...s.code}>{'<html>'}</code> or{' '}
        <code {...s.code}>{'<body>'}</code> element. No changes to your
        stylesheets are needed -- the same semantic token names resolve to
        different values automatically.
      </p>

      <h2 {...s.h2}>Custom Themes</h2>
      <p>
        To create a custom theme, define a CSS file that sets values for all the
        custom properties your system's tokens reference. The property names
        follow the pattern used by your token definitions:
      </p>
      <CodeBlock>{`/* my-theme.css */
:root {
  /* Colour tokens */
  --color-background: 0 0% 98%;
  --color-foreground: 240 10% 10%;
  --color-action: 220 90% 56%;
  --color-on-action: 0 0% 100%;
  --color-muted: 220 14% 96%;
  --color-elevated: 0 0% 100%;
  --color-subtle: 220 13% 91%;

  /* Border radius tokens */
  --radius-small: 3px;
  --radius-medium: 5px;
  --radius-large: 10px;
  --radius-full: 9999px;

  /* Shadow tokens */
  --shadow-small: 0 1px 3px rgba(0,0,0,0.1);
  --shadow-medium: 0 4px 12px rgba(0,0,0,0.1);
}`}</CodeBlock>
      <p>Then import your custom theme instead of the built-in one:</p>
      <CodeBlock>{`// toned.config.ts
import './my-theme.css'  // your custom theme
import { defineConfig, setConfig } from '@toned/core'
// ... rest of config`}</CodeBlock>

      <h2 {...s.h2}>Runtime Theme Switching</h2>
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
