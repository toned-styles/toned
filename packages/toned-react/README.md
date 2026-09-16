# @toned/react

React 18/19 bindings for Toned's web and native hosts. Declarations are immutable;
matching plans are shared; each mounted hook owns its committed runtime state.
The React entry and context subpaths declare a client boundary; server-only
resolution imports `@toned/core/server`.

## Declare and render

```tsx
import { defineConfig, defineSystem, defineToken } from '@toned/core'
import { ConfigProvider, useBind } from '@toned/react'
import web from '@toned/react/react-web'

export const system = defineSystem({
  id: 'controls',
  tokens: {
    tone: defineToken({
      values: ['neutral', 'accent'] as const,
      resolve: value => ({ backgroundColor: value === 'accent' ? '#315bd6' : '#eee' }),
    }),
  },
})

export const buttonStyles = system
  .stylesheet(q => ({
    Root: { $kind: 'pressable', tone: 'neutral', [q.state('hover')]: { tone: 'accent' } },
  }))
  .variants<{ size: 's' | 'm' }>()($ => ({
  [$.size('s')]: { Root: { $style: { padding: 4 } } },
  [$.size('m')]: { Root: { $style: { padding: 8 } } },
}))

const config = defineConfig({ ...web, mediaMode: 'css', pseudoMode: 'css' })

function Button() {
  const s = useBind(buttonStyles, { size: 's' })
  return (
    <s.Root as="button" type="button">
      Save
    </s.Root>
  )
}

export function Application() {
  return (
    <ConfigProvider config={config}>
      <Button />
    </ConfigProvider>
  )
}
```

Build the CSS before serving the application, including lazily imported sheets:

```ts
import { buildStyles } from '@toned/core/build'
import { system, buttonStyles } from './button-styles'

const artifact = buildStyles(system, { sheets: [buttonStyles] })
// Write artifact.css with the application's build pipeline and import that file.
// Keep artifact.manifest with the corresponding deployed build.
```

The example declarations should live in a pure module (`button-styles.ts`), with
React components/configuration in another module. CSS generation never runs in
render. The host chooses the React DOM root, framework, or native application
entry; Toned does not mount the application.

## Prop bags and overrides

`useStyles(sheet, mods)` returns element prop bags for spreading. `useBind` returns
stable component functions and an immutable `$props` map for this render:

```tsx
const s = useBind(buttonStyles, { size: 's' })
return <button {...s.$props.Root.withProps<'button'>({ type: 'submit', disabled: true })} />
```

`withProps<Host>` checks the selected intrinsic or component's props; without a
host argument it checks `div` props. It merges ordinary props, inline styles,
classes, handlers, and callback/object refs, including React 19 cleanup. Semantic
tokens belong in declarations or `overrideStyles`. The broad `.with` spelling
remains a compatibility alias.

Use `StyleOverrides` with `overrideStyles(sheet, rules)` to add complete precedence
layers. An override's defaults beat earlier variants; its own matching conditions
then specialize it. Ordinary `sheet.extend(rules)` derives new defaults while
retaining the original variants' precedence. Neither construction reads ambient
theme values or probes resolvers. Token property collisions resolve from ordered
operations using the committed render's tokens.

## Render and commit

`useStyles` creates a private candidate. A layout effect commits it after React's
host mutations and before paint. Suspended renders cannot publish variants,
theme values, refs, or subscriptions. Events continue to update the committed
controller and patch hosts directly, without rendering React.

Web callback-ref cleanup restores the departing controller's last committed
declaration before React mutates replacement props. This clears interaction-only
styles that React never declared. Deferred final release only drops bookkeeping,
so a reused DOM node keeps its new caller's styles and classes, including values
identical to the old declaration. Surviving controllers retain their own requests.

Bare bound components refresh from the committed store in layout, before paint.
When child layout effects must measure the new styles during that same commit,
use the optional render scope:

```tsx
const s = useBind(buttonStyles, { size: 'm' })
return s.$scope(
  <s.Root>
    <MeasuredChild />
  </s.Root>,
)
```

The scope's stable context carries this render's candidate and works during SSR.
Spreading `$props` also installs render-current styles. Without the scope, an
earlier descendant layout effect can observe the previous bound snapshot before
the owning hook publishes. Compatibility properties on `s.Root` itself expose
committed values; read `$props.Root` during render.

Each `$props.Root` access creates a separate host ref binding, so repeated parts
can each spread it safely. Read the property for each host; do not save one prop
bag and spread that same callback ref onto multiple hosts. Bound components
already create a separate binding per mounted instance.

`ConfigProvider` scopes an immutable host/backend configuration; hooks retain the
installed `setConfig` value as a migration fallback. Module-level `bind(sheet)`
uses static configuration and does not read override/provider context. Prefer
`useBind` for scoped configuration and theme changes.

## Backends and native hosts

`Config.backend` selects an output adapter from `@toned/core/backends`. The host
platform and backend platform must agree. CSS variables use pre-generated CSS;
a Tailwind profile maps exact resolved fields to pre-built utilities and optional
parameter channels. Runtime facts drive backend profiles that do not support
browser condition chains. No backend compiles CSS during rendering.

The native binding requires forwarded targets exposing `setNativeProps` with
merge patches and `null` resets. It diffs owned style and bridge-prop writes,
restores committed caller baselines, and resets dropped fields. Unsupported refs
throw at attachment. Native arrays of plain style objects work; resolve numeric
registered styles with the host's `StyleSheet.flatten` first. Put interaction
styles in declarations rather than state-dependent `style` callbacks.

Native host fixtures cover patch semantics and cleanup. They do not certify a
particular React Native/Fabric release; applications must verify their selected
host's imperative-update contract. Web grid remains an explicit web capability.
