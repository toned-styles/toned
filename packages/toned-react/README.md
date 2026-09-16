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

`useStyles(sheet, { variants, overrides })` returns element prop bags for spreading.
The legacy `useStyles(sheet, mods)` call remains accepted. `overrides` accepts a
partial declaration or an `overrideStyles(sheet, rules).variants(...)` entry;
this instance layer applies after all provider layers. The hook, providers and
pure `overrideSheet` composition share the same core override implementation. An entry targeting another
sheet throws. Keep reusable override objects outside rendering for plan reuse.
`null` removes the inherited declaration at the same rule path; `undefined` leaves it unchanged.
Removing a base token does not erase a separate variant declaration: target that
variant with an override entry when it should also be removed. This is structural
removal before matching, not a CSS `initial` value or a native host reset.

The checked factory accepts defaults as its second argument:

```tsx
const sheet = system.stylesheet({ Root: { $kind: 'pressable' } })
  .variants<{ size: 's' | 'm'; active: boolean }>()(
    $ => ({ [$.size('s')]: { Root: { $style: { padding: 4 } } } }),
    { defaults: { size: 'm' } },
  )
const s = useStyles(sheet, { variants: { active: false } })
```

Axes with defaults become optional; other required axes remain required. Omitted
and explicitly `undefined` values select the default. Declared defaults themselves
must be defined scalar values; `null` never means a variant value. Defaults persist
through `extend`, `when`, and override layers. The existing `useBind` flat modifier
argument remains unchanged.

 `useBind` returns
stable component functions and an immutable `$props` map for this render:

```tsx
const s = useBind(buttonStyles, { size: 's' })
return <button {...s.$props.Root.withProps<'button'>({ type: 'submit', disabled: true })} />
```

`withProps<Host>` checks the selected intrinsic or component's props; without a
host argument it checks `div` props. A spread destination cannot feed a type
backwards into a hook, and `$kind` does not name a concrete host component. Use
`withProps<typeof NativeView>(...)` for native/foreign primitives and
`withProps<'button'>(...)` for a concrete web element. The generic resolved bag
exposes unknown style fields; the selected host supplies precise prop/style/ref
types. It merges ordinary props, inline styles,
classes, handlers, and callback/object refs, including React 19 cleanup. Semantic
tokens belong in declarations or `overrideStyles`. The broad `.with` spelling
remains a compatibility alias.

Use `StyleOverrides` with `overrideStyles(sheet, rules)` to add complete precedence
layers. An override's defaults beat earlier variants; its own matching conditions
then specialize it. Ordinary `sheet.extend(rules)` derives new defaults while
retaining the original variants' precedence. Neither construction reads ambient
theme values or probes resolvers. Token property collisions resolve from ordered
operations using the committed render's tokens. Derived override plans use a
bounded 64-entry LRU per source sheet; alternating sibling provider sequences
reuse their plans rather than replacing one global cache slot.

## Render and commit

`useStyles` creates a private candidate. A layout effect commits it after React's
host mutations and before paint. Suspended renders cannot publish variants,
theme values, refs, or subscriptions. Events continue to update the committed
controller and patch hosts directly, without rendering React. Runtime container
measurements use a stable hierarchical store: nearest same-name containers shadow
ancestors, subscriptions exist only for committed controllers, and width changes
patch selected declarations without changing a React context value. Legacy manual
`ContainerSizesContext` inputs still participate in ordinary React renders.

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

## Explicit renderer configuration

Prefer `TonedProvider` for new integrations:

```tsx
import { createWebRenderer } from '@toned/core/server'
import { TonedProvider } from '@toned/react'
import web from '@toned/react/react-web'

const renderer = createWebRenderer(system, { manifest, tokens: {} })
return <TonedProvider renderer={renderer} host={web} theme={currentTokens}>
  <Application />
</TonedProvider>
```

The renderer is pure and owns the system, backend and build validation. The host
owns refs, events, primitives and measurement. Their platforms must agree. The
provider derives CSS/runtime modes from backend capabilities and validates each
resolved sheet against the renderer; components do not choose implementation
switch combinations. `theme` explicitly replaces the renderer's token snapshot
for that tree. Native hosts require a registered `nativeHost` adapter.

`ConfigProvider` and `setConfig` remain compatibility paths for existing host
integrations. Their low-level flags are legacy tuning, not the new configuration
contract. Legacy React configurations now carry a context identity; `useStyles`
reads it through public `useContext`, then gives constructors a pure token snapshot.
React 18 and 19 use the same mechanism. No private dispatcher access or hooks in
getters remain. An explicitly supplied pure `getTokens` overrides that legacy
context binding.

`TonedProvider` compares the host's fields rather than its wrapper object:
`host={{ ...web, useStyleOverrideScope }}` preserves bound component identities
when those fields are unchanged. Keep host callback implementations stable.
`useStyleOverrideScope` reads at the consuming component so nested host contexts
retain their meaning. React cannot replace an arbitrary custom hook with a
potentially different hook sequence inside that mounted consumer. Accordingly,
`ConfigProvider` validates that this hook's identity stays fixed; changing or
removing it requires a new provider `key`, which explicitly remounts that host
integration. Other configuration updates and context value changes do not require
that remount. A named Toned error diagnoses a changed hook before React encounters
an inconsistent hook count.

Module-level `bind(sheet)` and legacy `t` getters are pure, static snapshots of the
installed configuration. They cannot consume provider context outside React.
Web's fallback supplies CSS variable references; literal/native theme consumers
must use `useStyles`/`useBind` or a pure renderer with explicit tokens.

## Backends and native hosts

`Config.backend` selects an output adapter from `@toned/core/backends`. The host
platform and backend platform must agree. CSS variables use pre-generated CSS;
a Tailwind profile maps exact resolved fields to utilities and optional parameter
channels. Use the backend returned by `buildTailwind` for validated CSS delivery
and browser conditions. It retains self states and media/container queries in CSS;
cross-part host facts patch utility classes without rendering React. An unbuilt
profile is rejected by the mounted host. No backend compiles CSS during rendering.

The native binding requires forwarded targets exposing `setNativeProps` with
merge patches and `null` resets. It diffs owned style and bridge-prop writes,
restores committed caller baselines, and resets dropped fields. Unsupported refs
throw at attachment. Native arrays of plain style objects work; resolve numeric
registered styles with the host's `StyleSheet.flatten` first. Put interaction
styles in declarations rather than state-dependent `style` callbacks.

Native host fixtures cover patch semantics and cleanup. They do not certify a
particular React Native/Fabric release; applications must verify their selected
host's imperative-update contract. Web grid remains an explicit web capability.

Native direct patches now require an explicit `nativeHost` adapter. See
[NATIVE-HOSTS.md](./NATIVE-HOSTS.md) for the integration contract, ownership
semantics and the distinction between adapter fixture tests and concrete renderer
certification. A `setNativeProps` member alone never enables native support.


## React version conformance

The HQ consumer runs `bun scripts/build/test-toned-react-versions.ts` in CI. It
installs React 18.3.1 and 19.2.7 into disposable directories outside the checkout,
using `npm ci --ignore-scripts` and a committed complete lockfile per version at
`scripts/build/fixtures/toned-react-versions`. It then runs the same guarded commit,
context, container, binding and ref fixtures. Both legs resolve React, React DOM
and the testing library from their isolated consumer; version sentinels assert
the actual React and React DOM versions. The isolated React 19 leg is deliberate:
it verifies the pinned standalone consumer graph independently of HQ's workspace
React version and dependency resolution.
Dependency installation happens before tests; test processes and workers retain
filesystem, credential, service and network isolation.

Callback refs return cleanup functions on React 19. React 18 retains the cleanup
internally and invokes it through `ref(null)`. Bound parts forward caller refs on
both versions. Foreign components must forward refs too (`forwardRef` on React 18);
a component accepting a prop named `ref` only works as such on React 19.
