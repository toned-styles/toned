# Android Fabric acceptance

This is an offline, pinned native consumer of Toned's built packages. It checks
mounted Android views, rather than substituting JavaScript hosts or treating a
successful `setNativeProps` call as evidence that pixels changed.

The matrix is React Native **0.86.0**, React **19.2.3**, Fabric, Hermes and Android
arm64. It does not certify other versions, Paper, iOS or external styling engines.
Unistyles is out of scope, and native grid is unsupported.

## Running the acceptance

The app is not part of the pnpm workspace. Its exact React version must match
React Native's renderer, so it is installed in an OS-temporary consumer from its
committed npm lockfile, with one physical React installation of its own and
Toned's built packages copied in. It never installs React inside the Toned
workspace.

Prerequisites: Android SDK platform 36, build tools 36.0.0, NDK 27.1.12297006,
CMake 3.22.1, an Android arm64 emulator image and JDK 21 (JDK 26 fails the
Android CMake preparation used by this pinned template). The Gradle wrapper pins
9.3.1 and verifies its download checksum. Dependency fetching and native
compilation are preparation steps; the device run itself needs no network.

An acceptance run has three phases:

1. **Prepare:** build Toned's packages, copy them and this app into a temporary
   workspace, and install the app's pinned dependencies.
2. **Build:** compile an APK with the JavaScript bundle embedded.
3. **Run:** boot a dedicated headless, read-only emulator, install and launch the
   APK, perform the touch gesture described in [SCENARIOS.md](src/SCENARIOS.md),
   collect the report, and stop the emulator. An already running device is never
   used or reset.

The automation that drives these phases is not included in this repository.

The app is debuggable only so `adb run-as` can retrieve its private report. React
Native dev support is disabled and JavaScript is bundled into the APK. The merged
manifest removes Internet permission, and a run verifies installed permissions
before launching it. No Metro server, application backend or external service is
part of device acceptance; the Android permission, not a JavaScript guard, keeps
the native process offline.

The recorded run passed **eight scenarios and real touch, 69 assertions** on
the profile above. Its [machine-readable record](verification/android-api36-capabilities-2026-09-26.json)
contains the exact source input and APK hashes used on the device, with a
[screenshot](verification/android-api36-capabilities-2026-09-26.png). Earlier
six-scenario records ([1](verification/android-api36-2026-09-26.json),
[2](verification/android-api36.json)) remain for reference.

The motion scenario reads native width, height and alpha during entry,
interruption, property removal, reduced-motion settlement and retained exit.
Deterministic JS frame inputs drive the same native host writer, with no extra
React commits; disposal removes scheduled work and preference subscriptions.
This establishes JS-driven patches, not UI-thread animation or every-frame paint.
The adaptive scenario measures an independently constrained native parent,
switches finite row/stack variants, checks hysteresis and explicit text-scale
inputs, and preserves child host identity. Readiness uses the same one-logical-unit
tolerance as geometry assertions because Android rounds dimensions to device pixels.

A run saves `evidence/results.json`, `build.json`, `screen.png` and `logcat.txt`
in its temporary workspace. Success requires the pinned Fabric/Hermes runtime, every
automatic scenario, and a real device press/release gesture. The `complete`
result alone does not pass a run. See
[SCENARIOS.md](src/SCENARIOS.md) for the assertions and limits.

## Integration boundary

`src/host.ts` is the application adapter used by the acceptance run. It maps
semantic primitive kinds, declares the renderer version, delegates native merge
patches to `setNativeProps`, uses null resets, and supplies viewport/direction
facts. Unsupported semantic state or relationship capabilities are not silently
inferred from a host's method names.

The readback module is acceptance instrumentation only. It resolves real Android
views on the UI thread and reads their geometry, opacity, text and hint colours.
It never echoes Toned's requested properties. The styling library has no dependency
on this module and does not use it to apply styles.

The Android bootstrap is derived from
`@react-native-community/template@0.86.0`; its MIT licence is preserved in
[android/TEMPLATE-LICENSE](android/TEMPLATE-LICENSE). The bundled debug signing
key is the template's public development key, not a distribution credential.
