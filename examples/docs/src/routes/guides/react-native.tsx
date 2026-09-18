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
      <h1 {...s.h1}>React Native integration</h1>
      <p>
        Toned shares portable declarations and resolves native style fields.
        Your application supplies its renderer, concrete primitives and an
        explicit host adapter. Importing the native configuration alone does not
        establish a working or certified React Native integration.
      </p>

      <h2 {...s.h2}>1. Define portable parts</h2>
      <CodeBlock>{'npm install @toned/core @toned/react'}</CodeBlock>
      <CodeBlock>{`// styles.ts
import { defineSystem } from '@toned/core'

export const ui = defineSystem({ id: 'native-example', tokens: {} })
export const cardStyles = ui.stylesheet({
  Root: { $kind: 'view', $style: { padding: 16, backgroundColor: '#fff' } },
  Title: { $kind: 'text', $style: { color: '#172033', fontSize: 20 } },
})`}</CodeBlock>
      <p>
        Shared <code {...s.code}>$style</code> declarations use the portable
        property intersection. Explicit platform blocks can widen styles for
        that platform. Native rejects unsupported CSS fields and values; a
        web-only cursor or CSS variable is not automatically translated into a
        native equivalent. Theme resolvers must supply concrete native values.
      </p>

      <h2 {...s.h2}>2. Declare the application host</h2>
      <CodeBlock>{`// host.ts — integration-owned adapter
import { Dimensions, Image, Pressable, Text, View } from 'react-native'
import { defineReactNativeHost } from '@toned/core/stylesheet'
import type { ReactHost } from '@toned/react'
import native from '@toned/react/react-native'
import { isApplicationFabricHost, appReactNativeVersion } from './host-identity'

const adapter = defineReactNativeHost({
  renderer: 'fabric',
  version: appReactNativeVersion,
  isHost: isApplicationFabricHost,
})

const primitives = { view: View, text: Text, image: Image, pressable: Pressable }
export const host: ReactHost = {
  ...native,
  nativeHost: {
    ...adapter,
    getViewportWidth: () => Dimensions.get('window').width,
    subscribeViewport: notify => {
      const subscription = Dimensions.addEventListener('change', () => notify())
      return () => subscription.remove()
    },
  },
  resolveElement: kind => primitives[kind ?? 'view'],
}`}</CodeBlock>
      <p>
        The host identity module in this example belongs to your integration:
        verify actual forwarded hosts from the selected renderer, not merely the
        presence of <code {...s.code}>setNativeProps</code>. The helper declares
        merge patches and null resets; a version string does not prove that the
        renderer implements them correctly. Validate View, Text and input
        targets, style removal, caller baselines, ref replacement and
        interrupted renders in a real native application.
      </p>

      <h2 {...s.h2}>3. Install a renderer and render the parts</h2>
      <CodeBlock>{`// App.tsx
import { nativeBackend } from '@toned/core/backends'
import { createRenderer } from '@toned/core/server'
import { createElements, TonedProvider } from '@toned/react'
import { cardStyles, ui } from './styles'
import { host } from './host'

const renderer = createRenderer(ui, { backend: nativeBackend, tokens: {} })
const Card = createElements(cardStyles)

export default function App() {
  return (
    <TonedProvider renderer={renderer} host={host}>
      <Card>
        <Card.Root>
          <Card.Title>Hello from Toned</Card.Title>
        </Card.Root>
      </Card>
    </TonedProvider>
  )
}`}</CodeBlock>
      <p>
        The provider scopes renderer inputs to this tree. The element family
        keeps component identities stable; its provider shares variant inputs
        and cross-part ownership without adding a native layout wrapper.
        Independent parts can also render standalone with their base/default
        declarations. Bound refs must reach the real native hosts.
      </p>

      <h2 {...s.h2}>4. Measurements, states and capability limits</h2>
      <p>
        Viewport queries require the adapter&apos;s{' '}
        <code {...s.code}>getViewportWidth</code> and{' '}
        <code {...s.code}>subscribeViewport</code> capabilities. The example
        supplies them using Dimensions; Toned does not install a Dimensions
        subscription or browser matchMedia fallback automatically. Runtime
        container queries use the native binding&apos;s onLayout measurement
        props, including host-local measurements within one family.
      </p>
      <p>
        Hover, active and focus facts come from primitive events. Additional
        semantic states need declared readers and subscriptions. Cross-part
        relationships also need committed parent topology; native parent
        traversal is not assumed. Native props include refs, event handlers and
        configured bridge props as well as style fields.
      </p>
      <p>
        Grid remains a web capability. Named-area ownership alone cannot
        implement intrinsic native track sizing or span placement. A native grid
        needs an integrated layout engine and its own acceptance tests. The
        older Expo demo has not yet established that acceptance or certified a
        concrete Fabric renderer.
      </p>
      <p>
        Opaque styles from other engines must use an explicit primitive adapter
        and a separate prop rather than Toned&apos;s plain style merger. Ordered
        style arrays do not coordinate two engines&apos; imperative writes to
        the same field; overlapping ownership needs an integration-aware writer.
      </p>
    </article>
  )
}
