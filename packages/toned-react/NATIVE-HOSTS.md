# Native host integration

Toned owns declaration resolution and differential patch requests. The application
owns its native renderer, concrete host components and committed parent topology.
A method called `setNativeProps` does not prove any of those contracts.

Install a `nativeHost` adapter alongside the native binding configuration. An
adapter declares its renderer/version, validates actual host identity, applies
merge patches and supplies reset values for removed style fields and host props.
The native binding registers accepted refs only during commit and retains that
registration until deferred ownership cleanup completes. Two controllers may
share one host only through the same adapter instance.

```ts
import { defineReactNativeHost } from '@toned/core/stylesheet'
import native from '@toned/react/react-native'

const nativeHost = defineReactNativeHost({
  renderer: 'fabric',
  version: appReactNativeVersion,
  // Integration-owned identity check; never just `'setNativeProps' in value`.
  isHost: isApplicationFabricHost,
})
const config = { ...native, nativeHost, resolveElement: applicationElements }
```

`defineReactNativeHost` supplies the React Native null-reset/merge-patch protocol.
It does **not** certify a version merely because a caller passes that version
string. Custom renderers supply their own `NativeHostAdapter`, including different
reset values if needed. Caller baselines come from committed host props; native
nodes do not expose a reliable generic style readback API. Other imperative
writers must coordinate ownership through the same integration.

## Support boundary and required host acceptance

No concrete RN/Fabric host is certified by this repository. `toned-react` has no
React Native dependency, ships no View/Text implementation and does not own a
native app or renderer build. Choosing an RN host package/version is an integration
architecture decision; a simulated object or JS test renderer cannot certify the
native mounting layer on its behalf. An application must choose its supported
renderer and run the following gate there before advertising that host as supported:

1. Mount real View, Text and TextInput targets with caller resting styles and
   bridge props; reject composite refs and hosts from another renderer.
2. Commit a state change, then remove it. Verify dimensions through native layout
   measurement and appearance/bridge properties through renderer assertions or
   device screenshots. Removed fields must reset, caller values must survive,
   repeated equal updates must not write.
3. Change React-owned baseline props while an imperative state is active. Confirm
   the final committed result before paint; include interrupted/Suspense renders.
4. Attach two owners, detach one, reuse a mounted host and finally unmount it.
   Verify no surviving owner loses its values and no delayed write reaches a
   recycled host.
5. For relationships, provide committed parent links (`nativeHost.parentOf`), topology notifications
   (`subscribeTopology`), and `readState` for semantic states beyond hover/active/focus;
   verify child versus descendant, moves, portals, multiple instances and cleanup.
   No public native parent traversal is assumed.

The executable tests beside `native-host.ts`, `applyStyles.ts` and
`native-patches.test.ts` establish Toned's adapter/ownership behavior. Their adapters
are explicitly named **fixtures**, not Fabric evidence. The acceptance gate above
remains the responsibility of the chosen concrete host integration; bypassing it
would create a support claim the library cannot substantiate.

## Native grid

Grid remains rejected on native. The native host must expose a layout engine with
track and placement mutation in its native measurement lifecycle. Computing a
parallel JS rectangle layout would violate the selected architecture and diverge
from intrinsic native text measurement. React context supplies ownership/topology,
not a replacement layout engine.

The upstream [Yoga grid change](https://github.com/react/yoga/pull/1865) was still
open when checked on 2026-09-16. It is not an integrated React Native host contract.
Even after upstream support lands, a host must expose the needed bindings and pass
track, placement, intrinsic measurement and responsive-update conformance before
Toned can enable native grid. Web grid remains available independently.

Native viewport queries require `getViewportWidth` and `subscribeViewport` on
the host adapter. Widths are logical layout units; changes publish condition facts
to committed controllers without React renders. Numeric thresholds and explicit
`px` widths are supported. Raw CSS queries and CSS-dependent units such as `rem`
are rejected with a named diagnostic: a native declaration must express the
corresponding semantic condition, rather than asking a missing browser to parse
it. Container-only sheets do not require viewport capability. No native path
falls back to a missing `window.matchMedia`.

## Semantic state facts

Ordinary local states and source-part conditions use the same committed native
behavior facts as relationships. `hover`, `active` and `focus` come from primitive
events. Other public state names/aliases require `nativeHost.readState(host, name)`
and `subscribeState(notify)`; `subscribeTopology` remains a compatible notification
fallback. Ordinary state rules require no parent traversal. An optional `states`
list declares the supported names; otherwise the reader must throw for unsupported
names. Readers receive public names such as `selected`, not web selector strings.
`focus-visible` requires the integration's input-modality decision and must never
be silently substituted with `focus`.

Readers run only for committed hosts. Notifications update controller facts and
host patches directly, without rendering React components. Repeated hosts retain
their own semantic state; subscriptions transfer at committed candidate handoff
and stop on disposal. Native host acceptance should exercise state toggling,
source-part targets, sibling isolation and missing capability errors in addition
to the mounting/ownership gate above. These are library fixture results until a
concrete application runs that gate on its chosen renderer.
