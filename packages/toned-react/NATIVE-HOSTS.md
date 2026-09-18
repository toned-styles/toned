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

## Verified Android profile

The [Fabric acceptance app](../../examples/fabric-acceptance/README.md) runs
Toned's built JavaScript against real Android hosts. The verified profile is
**React Native 0.86.0 / React 19.2.3 / Fabric / Hermes / Android 16 API 36 / arm64**.
This is a versioned application adapter, not a claim that every Fabric release,
platform or object exposing `setNativeProps` is supported.

The September 18 run passes six automatic scenarios and a real emulator-driven
press/release gesture, with 49 assertions. Native measurements, Android drawing
paint and hint colour readback establish the result; requested JavaScript patches
are not substituted for those observations. The retained
[acceptance evidence](../../examples/fabric-acceptance/verification/android-api36.json)
records the exact runtime, emulator fingerprint, input/APK hashes and assertions.

| Contract | Device evidence |
| --- | --- |
| Primitive mounting | Real View, Text, TextInput and Pressable dimensions; only connected native Element refs are accepted, and a method-forwarding composite is rejected. |
| Direct interaction updates | Native focus/blur and physical press/release change layout/opacity and restore resting values. Focus does not require a React primitive commit. |
| Caller ownership and removal | Removing imperative minHeight reveals the caller's changed height; placeholder removal restores the platform default; explicit caller hint colours survive active state and later caller commits. |
| Appearance | Native text drawing paint changes/restores colour and alpha. RN Text uses spans, so the probe resolves the first glyph's paint rather than reading the unused TextView default. |
| Concurrent rendering | An actually suspended variant render leaves the committed native width unchanged; resolving it updates the same host. |
| Host lifetime | Variant updates and callback-ref handoffs preserve the mounted host; cleanup balances; detaching one of two controllers preserves the survivor's active style and future updates. |

The APK bundles JavaScript with dev support disabled and has no Internet
permission. The runner checks installed permissions, waits for Android's install
broadcasts, starts its own read-only emulator and requires every scenario plus the
native gesture to pass in one mounted run. It records an input/APK receipt and
rejects stale builds. The isolated consumer has one exact React installation
outside the embedded checkout. See the app README for the repeatable command.

The native reporter is test instrumentation, not a library dependency. It reads
mounted Android views on the UI thread; Toned still writes through the declared
`setNativeProps`/null-reset adapter. Native mount latency is retried only for an
explicit `NOT_MOUNTED` response and has a bounded deadline.

## Scope of that evidence

The verified profile covers the contracts listed above. It does not establish:

- iOS, Paper, other React Native versions or external styling engines. Unistyles
  is explicitly outside the current work. The inspected host has Android SDK,
  NDK/CMake and a verified JDK 21 build, but only Apple's Command Line Tools,
  without the full Xcode/iOS simulator toolchain.
- Native relationship topology, virtualized-list recycling, arbitrary semantic
  state readers, rotation/viewport/container acceptance or native grid. Library
  fixture tests cover the declared protocols; each concrete integration needs its
  own native scenarios before advertising those capabilities.
- A frame-by-frame absence of transient paint between all possible native commits.
  The app checks the final native result and the suspended committed tree; its
  bounded readback polling is not a native drawing-frame trace.

For relationships, a host supplies committed parent links (`parentOf`), topology
notifications (`subscribeTopology`) and semantic state readers as needed. Modern
RN primitive refs provide public node traversal, which can help implement parent
lookup; traversal alone does not notify the library of committed moves or certify
portals, recycling and cleanup. The core does not invent a missing observer.

The older [Expo demo](../../examples/expo-app) remains a historical integration
sketch. It is superseded as the native acceptance target by the pinned app above;
its obsolete configuration is not used to make support claims. `toned-react`
continues to have no React Native dependency and ships no View/Text implementation.
Applications choose their concrete primitives and adapter. Fixtures beside
`native-host.ts`, `applyStyles.ts` and `native-patches.test.ts` remain useful unit
coverage, but are distinct from this actual renderer evidence.

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
