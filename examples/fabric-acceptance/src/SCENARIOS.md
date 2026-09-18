# Android Fabric acceptance scenarios

`Harness` runs each scenario in a separate mounted subtree and calls `report`
with one JSON-compatible result per scenario, followed by a `kind: 'complete'`
result. A failure reports its completed assertions and the failing diagnostic;
render/commit errors are caught by the scenario boundary. The harness itself
does not open a socket or use a JS test renderer.

`host.ts` supplies the real application `config`, including its declared Fabric
host adapter. The consumer must use one pinned compatible React/RN installation.
Do not substitute fixture hosts or count adapter patch requests as native
acceptance evidence.

| Scenario | Native evidence |
| --- | --- |
| View, Text, TextInput, Pressable | Actual `measure()` dimensions; Pressable's forwarded Toned callbacks change its native width and restore it. |
| Focus, reset and caller baseline | `TextInput.focus()`/`blur()` produce real native focus events; `measure()` observes active dimensions, sibling isolation, state survival through a React baseline commit, and removal of `minHeight` revealing the new caller height. |
| Text appearance and bridge props | The Android reporter reads native TextView color/alpha and EditText hint color/focus; variants change and restore text appearance, focus applies a placeholder bridge, removal restores the platform hint color, and explicit caller hint colors survive active state. |
| Variants and refs | Native width changes on the same mounted host, survives callback-ref replacement, and caller refs release on unmount. |
| Suspense | After a variant render actually suspends, native width stays at the committed value; resolving the promise changes that same host's measured width. |
| Multiple owners | Two controllers change independent dimensions on one actual native View; detaching one leaves the survivor's state and updates working, while the removed width returns to parent stretch. |

Measurements retry until the actual native dimensions match (within one logical
unit) or a bounded deadline expires. Commit markers are synchronization aids;
they never replace native layout readback. Commit counts and object identities
supplement geometry assertions, and each assertion names its evidence source.
Handlers used by the runner are published after commit, not during render.

The Suspense case intentionally records one attempted-render witness immediately
before throwing its pending promise. That attempt cannot be witnessed from an
effect because it has not committed. This is test instrumentation only: the flag
does not publish stylesheet state, host writes or application UI state. Its React
Doctor configuration does not suppress this test instrumentation. The gate is
created once as a stable Suspense resource, without render-time ref assignment.
The final reporting effect likewise reports completed acceptance evidence to the
external runner; it does not synchronize application state between components.

The public readback contract comes from React Native's
[layout measurements](https://reactnative.dev/docs/0.86/the-new-architecture/layout-measurements)
and [TextInput methods](https://reactnative.dev/docs/0.86/textinput#methods).
Neither exposes arbitrary native color or bridge-property readback. For those
assertions, the application supplies
`NativeModules.TonedAcceptance.snapshot(findNodeHandle(host))`. It reads actual
Android views and returns logical-unit width/height, alpha, and native text/hint
colors plus focus. Text colour is the first glyph's drawing paint after native
character spans, because RN Text applies its foreground colour with a span
rather than the TextView default. Colors are compared as unsigned ARGB integers. This module
must query the mounted view on Android's UI thread, not echo the JS props or
Toned adapter's requested patch.

Fabric can expose shadow-tree measurements before its Android mount transaction
finishes. The reporter identifies that condition with `NOT_MOUNTED`; only that
specific error is retried, with one five-second deadline. All other native
reporter errors fail immediately, and a stalled reporter call times out.

## Remaining device checks

The initial Pressable callback case intentionally invokes the composed handler;
it does not claim to inject a native touch. After the automatic scenarios finish,
a persistent target with accessibility label and testID `fabric-touch-probe`
remains mounted. Its `kind: 'device-probe'`, `native touch ready` result contains
the measured screen position. Device automation can hold its center for at least
300ms, then release: actual `onPressIn`/`onPressOut` callbacks each emit a separate
result that reads native width and alpha (120/1 → 200/0.4 → 120/1). The automatic
`complete` result does not imply these external touch checks passed.

Native text/hint colors and alpha have automated native readback. Background
paint and selection appearance still need screenshots or additional native
assertions. Record those separately from the automatic scenario results.

Passing this harness does not certify native relationship topology, virtualized
list recycling, iOS, Unistyles, or native grid. Those require their corresponding
integration capability and acceptance scenarios. In particular, native grid
cannot be enabled by a JavaScript geometry test when the renderer supplies no
integrated grid layout engine.
