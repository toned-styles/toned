# Integrating other styling systems

Toned can render application-owned components through a part's typed `as` prop
or the host configuration's `resolveElement`. Those components can integrate
another styling system. This is an existing composition boundary, not a claim
that Toned ships a Unistyles backend or has certified a native Unistyles host.

| Integration | Current contract |
| --- | --- |
| Custom primitive | `as={Component}` checks that component's props and forwards the composed host ref. `resolveElement` supplies stable application defaults for semantic kinds. |
| Foreign style handle | Carry it in a separate component prop; consume it inside the primitive. Toned does not interpret arbitrary props as styles. |
| Shared theme/runtime | An application bridge can subscribe to another system and supply Toned's token/configuration inputs. No Unistyles-specific bridge is shipped. |
| Another engine executing Toned declarations | Requires declaration compilation, host binding, ownership and delivery integration; not implemented by the existing plain-field output adapter alone. |

## Keep foreign styles opaque

The current `style`/`withProps` path merges plain style fields. It flattens arrays
and snapshots caller fields for imperative ownership restoration. Do not put an
opaque engine handle in that channel, even when its TypeScript shape looks like
a style object.

Pass an explicitly typed application prop instead:

```tsx
const S = createElements(styles)

<S>
  <S.Label as={ApplicationText} foreignStyle={foreignStyles.label}>
    Save
  </S.Label>
</S>
```

`ApplicationText` defines the actual `foreignStyle` type and consumes that prop;
it must not forward it as an unknown DOM/native property. Toned's ordinary
`style` reaches this component as plain resolved fields. Keep the foreign handle
separate until the component reaches the other engine's supported binding API.

For Unistyles 3, this distinction is essential: spreading styles loses their
native C++ association, and its web handles are not readable resolved style
objects. Preserve handles and ordered arrays rather than extracting their fields.
See the [migration guide](https://www.unistyl.es/v3/start/migration-guide/)
and [web style model](https://www.unistyl.es/v3/references/web-styles/).

## One owner for each mutable field

Composition does not establish shared imperative ownership. Without a writer
that coordinates both engines, restrict each engine to disjoint fields and do
not let either engine's recalculation overwrite the other's fields. For example,
Toned may own spacing while a foreign engine owns text color; their adapters must
preserve that separation during theme changes, interaction updates and removal.

Putting a foreign color after a Toned color in a style array establishes initial
declarative order only. A later Toned state patch or reset can replace that color,
and Toned cannot restore an opaque foreign baseline it never observed. Conversely,
a foreign engine can reapply a stale plain Toned value during its own update.
Safe overlapping ownership needs one authoritative composer/writer with explicit
precedence, live baseline updates, reset semantics and generation-safe cleanup.
An array alone does not provide that mechanism.

## Unistyles on DOM and React Native Web

For custom DOM components, the public
[`getWebProps`](https://www.unistyl.es/v3/guides/custom-web/) function accepts
Unistyles style handles/arrays and supplies a class name and registration ref.
An application primitive can call it on `foreignStyle`, combine the resulting
class with its ordinary class name, and compose the registration ref with the
ref it receives from Toned. Preserve both engines' class contributions across
direct updates; do not replace the entire class attribute with one engine's value.

The web ref lifecycle needs explicit care. Upstream source inspected at
[`e116373`](https://github.com/jpudysz/react-native-unistyles/blob/e116373d6734c30d67c9ca41d9b6293fae6df30f/packages/unistyles/src/web-only/getWebProps.ts)
accepts an optional forwarded ref. Its
[registration callback](https://github.com/jpudysz/react-native-unistyles/blob/e116373d6734c30d67c9ca41d9b6293fae6df30f/packages/unistyles/src/web/utils/createUnistylesRef.ts)
unregisters when invoked with `null`; without a forwarded ref it returns no
cleanup. These are inspected source semantics, not a promise for every release.
Pin and verify the version used by an integration.

For that contract, obtain the Unistyles ref without supplying Toned's ref as its
second argument. Compose them at the application boundary: attach both callbacks
to the same DOM host, retain any returned Toned cleanup, and release both sides
on detach. Releasing the Unistyles side means invoking its callback with `null`.
The composed ref must support React 18's `ref(null)` and React 19's returned cleanup,
make cleanup idempotent, and clear object refs as appropriate. Do not return just
the forwarded Toned cleanup: React 19 can then skip the null callback that removes
the Unistyles registration. Handle replacement refs with the same discipline.

For RN/RNWeb primitives, keep the original foreign handles in an ordered style
array at the final wrapper boundary, for example `[plainStyle, foreignStyle]`.
That array must reach an Unistyles-aware primitive, not pass back through Toned's
plain-style merger or an arbitrary RNWeb style parser. The Babel transform and
component registration still need to cover this wrapper. Public
[`withUnistyles`](https://www.unistyl.es/v3/references/with-unistyles/) is another
third-party-component option, but its dependency updates can rerender that
component. Neither wrapper route certifies overlapping field ownership or native
reset behavior without acceptance tests.

## Share inputs or delegate the engine

A shared-input bridge can use Unistyles' public
[`StyleSheet.addChangeListener`](https://www.unistyl.es/v3/references/stylesheet/)
and [`UnistylesRuntime`](https://www.unistyl.es/v3/references/unistyles-runtime/)
getters to observe theme/viewport changes. Read immutable snapshots, subscribe
after commit, unsubscribe on release, and reconcile updates between render and
subscription. Carry scoped theme identity explicitly rather than treating the
global current theme as every subtree's theme. This keeps Toned's existing engine
and does not import opaque style output.

Delegating Toned execution to Unistyles is a larger integration. It needs a
compiler/registration contract, opaque output handles, a binding lifecycle, one
owner for writes, and supported mappings for Toned's predicates and variant
precedence. The current `OutputBackend` receives resolved plain fields and cannot
alone represent those responsibilities. In particular, the
[Babel plugin](https://www.unistyl.es/v3/other/babel-plugin/) establishes Unistyles'
dependency graph, primitive bindings and variant scopes. Wrapping an arbitrary
runtime Toned resolver in `StyleSheet.create` does not prove equivalent dependency
tracking or direct updates. This package does not use private ShadowRegistry/C++
APIs as an undocumented shortcut.

CSS delivery is also an explicit engine choice. Unistyles generates and updates
CSS and has its own [SSR collection/hydration lifecycle](https://www.unistyl.es/v3/guides/server-side-rendering/).
An opt-in integration must document and verify that delivery mode separately.
It cannot claim Toned's checked static manifest/no-runtime-injection contract for
foreign output. The existing Toned CSS backend retains that contract.

## Native acceptance

Unistyles 3 requires the New Architecture/Fabric, its native dependencies and
Babel processing; Expo Go is not supported. Its
[installation guide](https://www.unistyl.es/v3/start/getting-started/) requires a
custom native build. Library wrappers may need explicit
[Babel processing configuration](https://www.unistyl.es/v3/other/for-library-authors/).

Before advertising a native integration, run [the host acceptance gate](./NATIVE-HOSTS.md)
on the pinned renderer/engine combination, including foreign theme changes while
Toned state is active, field removal, caller baselines, ref replacement, two
owners, Suspense and recycling. Tests of plain fixture objects do not establish
that Fabric and an independently updating style engine honor those contracts.
