import { createFileRoute } from '@tanstack/react-router'
import { useStyles } from '@toned/react'
import { CodeBlock } from '../../components/CodeBlock.tsx'
import { proseStyles } from '../../styles/prose.ts'

export const Route = createFileRoute('/guides/react-native')({
  component: GuideReactNative,
})

function GuideReactNative() {
  const s = useStyles(proseStyles)
  return (
    <article {...s.container}>
      <h1 {...s.h1}>React Native Guide</h1>
      <p>
        toned-styles works with React Native, allowing you to share style
        definitions across web and native platforms. The core authoring model is
        identical; only the config and runtime differ.
      </p>

      <h2 {...s.h2}>1. Install Dependencies</h2>
      <CodeBlock>
        {'npm install @toned/core @toned/react @toned/systems'}
      </CodeBlock>
      <p>
        Note: you do not need <code {...s.code}>@toned/themes</code> for React
        Native since themes are handled differently on native platforms.
      </p>

      <h2 {...s.h2}>2. Create the Config File</h2>
      <p>
        The React Native config omits DOM-specific features like CSS class names
        and CSS media queries:
      </p>
      <CodeBlock>{`// toned.config.ts
import { defineConfig, setConfig } from '@toned/core'
import reactNativeConfig from '@toned/react/react-native'
import { system } from '@toned/systems/base'

export default setConfig(
  defineConfig({
    ...reactNativeConfig,
    useMedia: true,
  }),
)`}</CodeBlock>

      <h2 {...s.h2}>3. Import Config Early</h2>
      <p>
        Import the config at the top of your app entry point, before any
        component imports:
      </p>
      <CodeBlock>{`// App.tsx
import './toned.config.ts'

import { View, Text } from 'react-native'
import { useStyles } from '@toned/react'
import { appStyles } from './styles.ts'

export default function App() {
  const s = useStyles(appStyles)
  return (
    <View {...s.container}>
      <Text {...s.title}>Hello from toned-styles</Text>
    </View>
  )
}`}</CodeBlock>

      <h2 {...s.h2}>4. Shared Style Definitions</h2>
      <p>
        The key benefit of toned-styles is that your stylesheet definitions are
        platform-agnostic. The same stylesheet file works on both web and
        native:
      </p>
      <CodeBlock>{`// styles/card.ts - works on both web and native
import { stylesheet } from '@toned/systems/base'

export const cardStyles = stylesheet({
  card: {
    bgColor: 'elevated',
    borderRadius: 'large',
    borderColor: 'subtle',
    borderWidth: 'thin',
    shadow: 'small',
    padding: 3,
  },
  title: {
    textColor: 'primary',
    typo: 'heading_3',
  },
})`}</CodeBlock>
      <p>
        On the web, tokens like <code {...s.code}>bgColor</code> resolve to CSS
        custom properties. On React Native, they resolve to concrete colour
        values from your theme.
      </p>

      <h2 {...s.h2}>5. Platform Differences</h2>
      <p>
        <strong>No className</strong> -- React Native does not support CSS
        classes. The config adapter ensures that{' '}
        <code {...s.code}>useStyles</code> returns only{' '}
        <code {...s.code}>style</code> props.
      </p>
      <p>
        <strong>Media queries</strong> -- In React Native, breakpoint evaluation
        happens in JavaScript using <code {...s.code}>Dimensions</code> rather
        than CSS <code {...s.code}>@media</code> rules.
      </p>
      <p>
        <strong>style escape hatch</strong> -- When using the{' '}
        <code {...s.code}>style</code> property, prefer numeric values for
        dimensions (e.g. <code {...s.code}>padding: 24</code> instead of{' '}
        <code {...s.code}>'24px'</code>) to ensure compatibility with React
        Native's style system.
      </p>
    </article>
  )
}
