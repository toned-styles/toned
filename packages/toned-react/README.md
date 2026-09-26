# @toned/react

React 18/19 bindings for Toned's web and native hosts. Declarations are immutable;
matching plans are shared; each mounted instance owns its committed runtime state.
The React entry and context subpaths declare a client boundary; server-only
resolution imports `@toned/core/server`.

## Declare and render

```ts
// button-styles.ts — pure declarations, also imported by the CSS build.
import { defineSystem, defineToken, type Variants } from '@toned/core'

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
  .variants(($: Variants<{ size: 's' | 'm' }>) => ({
  [$.size('s')]: { Root: { $style: { padding: 4 } } },
  [$.size('m')]: { Root: { $style: { padding: 8 } } },
}))

```

```tsx
// button.tsx — runtime integration; this module is not imported by the CSS build.
import { TonedProvider, createElements } from '@toned/react'
import { createWebRenderer } from '@toned/core/server'
import { webHost as web } from '@toned/react/hosts/web'
import { system, buttonStyles } from './button-styles'
import { manifest } from './button-styles.generated'

const renderer = createWebRenderer(system, { manifest })
const S = createElements(buttonStyles)

function Button() {
  return (
    <S size="s">
      <S.Root as="button" type="button">Save</S.Root>
    </S>
  )
}

export function Application() {
  return (
    <TonedProvider renderer={renderer} host={web}>
      <Button />
    </TonedProvider>
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
React components and renderer configuration in another module. The generated
manifest import is the persisted build artifact, paired with the deployed CSS. CSS generation never runs in
render. The host chooses the React DOM root, framework, or native application
entry; Toned does not mount the application.

## Element families

Call `createElements(sheet)` once at module scope. It returns stable named part
components and a provider component on the same value. Creating the family does
not read tokens, install a host, or construct a mounted controller; configuration
and theme are read in the rendering tree.

```tsx
const S = createElements(buttonStyles)

// Standalone: base declarations plus any declared variant defaults.
<S.Root as="button">Default appearance</S.Root>

// Two independent instances of the same component family.
<S size="s"><S.Root as="button">Small</S.Root></S>
<S size="m"><S.Root as="button">Medium</S.Root></S>
```

`S` renders no DOM/native host or layout wrapper. Its props are the sheet's variant
axes and `children`; required axes remain required and axes with declared defaults
are optional. Put host props, refs and `as` on the named part. An explicit `as`
checks that intrinsic element's or custom component's props and ref type. Without
`as`, the host configuration resolves the part's semantic `$kind`. New family
parts are components only; they do not carry the compatibility prop bags exposed
by `useBind`.

Each part uses the nearest provider from its own family, even through other
component families. Sibling providers own separate state. A nested provider starts
its own instance from its inputs and the sheet's defaults; it does not inherit
variant inputs or interaction state from the outer instance. A standalone part
also owns its own instance: missing axes without defaults match no variant value.
Place `StyleOverrides` around the provider or standalone part to apply ambient
overrides; the family provider has no `overrides` prop.

Use a provider whenever parts must share ownership, including cross-part state
relations and named grid/area placement. A dependent part rendered standalone
throws `TonedMissingScopeError`, even if the sheet has no variants. Independent
parts in that sheet can still render standalone. The check includes effective
override declarations, so adding a relationship cannot silently turn an isolated
part into a disconnected instance. JSX types cannot prove component ancestry;
this ownership check runs when the part renders.

Variant updates travel with the provider's render snapshot. Descendant layout
effects observe the updated declarative host styles during that commit, and
suspended renders cannot publish their pending state. Local interaction and
measurement updates still patch committed hosts directly. The public component
references stay stable across variant and theme changes, preserving child state
and host identity.

React reserves `children`, `key`, and `ref` on JSX elements, so these cannot name
provider variant axes. Part names must also avoid properties reserved by the
callable family object. Types reject these collisions; factory checks also reject
reserved part names and axes present in runtime declarations/defaults. An unused
axis declared only in a TypeScript type has no runtime representation to inspect.

## Prop bags and overrides

`useStyles(sheet, variants)` returns element prop bags for spreading. Omit the
second argument when no variant input is required. The second argument is always
the flat variant map; `variants` and `overrides` remain legal scalar axis names.

Compose local changes as a declaration, then consume the resulting sheet through
any rendering API:

```tsx
import { overrideSheet } from '@toned/core'

// Module scope: a reusable declaration, also available to CSS build collection.
const compactStyles = overrideSheet(buttonStyles, { Root: { padding: 2 } })

const s = useStyles(compactStyles, { size, variant })
// Or createElements(compactStyles), or renderer.resolve(compactStyles, ...).
```

`overrideSheet` preserves parts, variant types and defaults. It adds an authoritative
layer: its base values beat earlier matching variants, and its own conditional
rules specialize that layer. Use `sheet.extend` instead when changing defaults
that the original variants should still override. `null` removes the inherited
declaration at the same rule path; `undefined` leaves it unchanged. Removing a
base token does not erase a separate variant declaration: target that variant
with the third `overrideSheet` argument when it should also be removed.

Use `StyleOverrides` and `overrideStyles(sheet, rules).variants(...)` when an
ancestor needs to customize a child's existing stylesheet without changing that
child. These entries match the **exact sheet object**, not its derivation ancestry,
and apply after its declared layers. An entry targeting `buttonStyles` does not
also target `compactStyles`; target the derived sheet explicitly where needed.
Keep reusable declarations outside rendering and include them in build collection
when they introduce CSS structure. For dynamic choices, prefer variants or select
among declared sheets. There is no hook-level override argument or extra local
precedence tier.

The checked factory accepts defaults as its second argument:

```tsx
type ButtonVariants = { size: 's' | 'm'; active: boolean }
const sheet = system.stylesheet({ Root: { $kind: 'pressable' } })
  .variants(
    ($: Variants<ButtonVariants>) => ({ [$.size('s')]: { Root: { $style: { padding: 4 } } } }),
    { defaults: { size: 'm' } },
  )
const s = useStyles(sheet, { active: false })
```

Axes with defaults become optional; other required axes remain required. Omitted
and explicitly `undefined` values select the default. Declared defaults themselves
must be defined scalar values; `null` never means a variant value. Defaults persist
through `extend`, computed query groups, and override layers. The existing `useBind` flat modifier
argument remains unchanged.

The existing `useBind`, `bind`, and `$scope` APIs remain supported. `useBind` returns
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
patch selected declarations without changing a React context value. Measurements
are selected per mounted host, so repeated parts inside different containers can
share one element-family provider without sharing the wrong container width. Legacy manual
`ContainerSizesContext` inputs still participate in ordinary React renders.

Web callback-ref cleanup restores the departing controller's last committed
declaration before React mutates replacement props. This clears interaction-only
styles that React never declared. Deferred final release only drops bookkeeping,
so a reused DOM node keeps its new caller's styles and classes, including values
identical to the old declaration. Surviving controllers retain their own requests.

`createElements` providers already carry the render snapshot described above.
For the compatibility `useBind` API, bare bound components refresh from the
committed store in layout, before paint. When child layout effects must measure
the new styles during that same commit, use the optional render scope:

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
import { webHost as web } from '@toned/react/hosts/web'

const renderer = createWebRenderer(system, { manifest })
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
`TonedProvider`, `ConfigProvider`, and legacy global consumers validate that this
hook's identity stays fixed; changing or removing it requires a new provider
`key`, which explicitly remounts that host
integration. Other configuration updates and context value changes do not require
that remount. A named Toned error diagnoses a changed hook before React encounters
an inconsistent hook count.

Legacy `setConfig` callers must install their scope hook before mounting, or
unmount their consumers before replacing or removing it. This guard is intentional:
swapping arbitrary hooks in an existing component can change React's hook order.
Updating values read by the same hook remains supported without a remount.

Module-level `bind(sheet)` and legacy `t` getters are pure, static snapshots of the
installed configuration. They cannot consume provider context outside React.
Web's fallback supplies CSS variable references; literal/native theme consumers
must use `createElements`, `useStyles`/`useBind`, or a pure renderer with explicit
tokens. Module-level `createElements` differs from `bind`: it creates component
identities only and reads the current provider configuration when they render.

## Backends and native hosts

See [Integration boundaries](INTEGRATIONS.md) for custom primitives, opaque style
values, React Native Web and Unistyles. Passing a component through `as` or
`resolveElement` does not install another styling engine's lifecycle or CSS delivery.

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

Native host fixtures cover patch semantics and cleanup. A separate real Android
acceptance app verifies the RN 0.86.0/React 19.2.3 Fabric/Hermes profile, including
native layout, text/placeholder paint, focus, touch, refs, ownership and Suspense.
Other versions/platforms require their own acceptance. Web grid remains an
explicit web capability; see the exact native scope below.

Native direct patches now require an explicit `nativeHost` adapter. See
[NATIVE-HOSTS.md](./NATIVE-HOSTS.md) for the integration contract, ownership
semantics and the distinction between adapter fixture tests and concrete renderer
certification. A `setNativeProps` member alone never enables native support.


## React version conformance

The HQ consumer runs `bun scripts/build/test-toned-react-versions.ts` in CI. It
installs React 18.3.1 and 19.2.7 into disposable directories outside the checkout,
using `npm ci --ignore-scripts` and a committed complete lockfile per version at
`scripts/build/fixtures/toned-react-versions`. It then runs the same guarded commit,
context, container, element-family, binding and ref fixtures. The package gate also
builds core and React, checks their emitted declarations and renders standalone/scoped
`createElements` from the packed JavaScript in Node; no TypeScript source loader is used. Both legs resolve React, React DOM
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

### Portable motion

`useMotion` from `@toned/react/motion` attaches transitions through Toned's host
writer. Keep options stable and pass the returned ref to a Toned part:

```tsx
const fade = {
  properties: ['opacity'],
  transition: { type: 'timing', duration: 180 },
  enter: { opacity: 0 },
  exit: { opacity: 0 },
} as const
function Panel() {
  const [present, setPresent] = useState(true)
  const motion = useMotion(fade)
  return present ? (
    <S.Root ref={motion.ref}>
      <button onClick={async () => {
        if (await motion.exit() === 'finished') setPresent(false)
      }}>Close</button>
    </S.Root>
  ) : null
}
```

The sheet must give Root a resting opacity, for example `$style: { opacity: 1 }`.
Entry starts only on committed host attachment. Keep the host mounted until exit
finishes; unmounting cancels it. Frames patch the existing web/native host without
React renders. The [motion contract](../toned-core/motion/README.md) lists supported
properties, reduced-motion sources and the native JS-thread capability boundary.

### Multiple systems in one tree

Use the same provider API for a mixed-system application:

```tsx
<TonedProvider renderer={[controlsRenderer, applicationRenderer]} host={web}>
  <Application />
</TonedProvider>
```

Each stylesheet selects its renderer by the exact owning system object. Duplicate
system registrations, incompatible hosts, and unregistered systems fail explicitly;
a provider never falls back to process-global configuration. A nested provider
replaces matching registrations and inherits the remaining parent registrations.
All renderers registered in one provider share its host. Keep renderer objects
stable; changing array order or an explicit theme does not recreate bound parts.

The `theme` prop applies to a single renderer. With an array, supply each renderer's
own tokens; `theme` is rejected as ambiguous. A nested single-renderer provider can
override that system's theme while inheriting the other systems. Theme reads remain
in React context, with host changes committed by the ordinary stylesheet lifecycle.
`ConfigProvider` and installed global configuration are compatibility APIs for
existing consumers outside this canonical renderer-provider integration.

Use `@toned/react/hosts/web` (`webHost`) or
`@toned/react/hosts/native` (`nativeHost`) with
`TonedProvider`. These host modules do not import legacy configuration or copy
process-global defaults. The native host supplies event/measurement adapters;
applications must additionally provide their actual native renderer adapter and
primitive resolver. The historical `react-web` and `react-native` entry points
compose these same hosts with legacy configuration for existing applications.
