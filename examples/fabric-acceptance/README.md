# Android Fabric acceptance

This is an offline, pinned native consumer of Toned's built packages. It checks
mounted Android views, rather than substituting JavaScript hosts or treating a
successful `setNativeProps` call as evidence that pixels changed.

The matrix is React Native **0.86.0**, React **19.2.3**, Fabric, Hermes and Android
arm64. It does not certify other versions, Paper, iOS or external styling engines.
Unistyles is outside the current scope. Native grid remains unsupported.

## Run from HQ

Install HQ's root pnpm dependencies first. The runner builds Toned with the same
isolation guards as its ordinary package tests, then copies only its built
packages into an OS-temporary consumer. The consumer's exact React version must
match React Native's renderer, so it uses its committed npm lockfile and one
physical React installation of its own. It never installs React inside Toned's
embedded checkout or changes HQ's renderer version.

Prerequisites: Android SDK platform 36, build tools 36.0.0, NDK 27.1.12297006,
CMake 3.22.1, an Android arm64 emulator image and a compatible JDK. The checked
Gradle wrapper pins 9.3.1 and verifies its download checksum. Dependency fetching
and native compilation are preparation; they are not network-enabled tests.

```sh
export ANDROID_HOME="$HOME/Library/Android/sdk"
bun scripts/build/test-toned-fabric.ts --avd Medium_Phone_API_36.1 \
  --java-home "<your JDK 21 directory>"
```

The command prints its temporary workspace. To retain the expensive native build
cache during diagnosis, reuse that path with `--workspace <path>` and
`--phase prepare`, `--phase build` or `--phase run`. Preparation refreshes the
fixture and built Toned packages; build compiles the bundled APK; run starts its
own headless, read-only emulator and stops that process when finished. A running
device on the requested port is rejected. `--port` selects another free, even
emulator port. No existing device is used or reset.

`--java-home` takes precedence over `JAVA_HOME`. This matters with version-manager
shims that rewrite `JAVA_HOME` while launching Bun. The runner prints the actual
Java version before invoking Gradle; JDK 26 fails the Android CMake preparation
used by this pinned template.

The app is debuggable only so `adb run-as` can retrieve its private report. React
Native dev support is disabled and JavaScript is bundled into the APK. The merged
manifest removes Internet permission, and the runner verifies installed permissions
before launching it. No Metro server, application backend or external service is
part of device acceptance. JavaScript guards cannot fence a native Android process;
that boundary is enforced by the app's Android permission instead.

The September 26 capabilities run passed **eight scenarios and real touch,
69 assertions** on the profile above. Its [machine-readable record](verification/android-api36-capabilities-2026-09-26.json)
retains the exact frozen-source input/APK hashes used for device execution.
Its [screenshot](verification/android-api36-capabilities-2026-09-26.png)
is retained alongside the earlier six-scenario [September 26 record](verification/android-api36-2026-09-26.json)
and [September 18 record](verification/android-api36.json).

The added motion scenario reads native width, height and alpha during entry,
interruption, property removal, reduced-motion settlement and retained exit.
Deterministic JS frame inputs drive the same native host writer, with no extra
React commits; disposal removes scheduled work and preference subscriptions.
This establishes JS-driven patches, not UI-thread animation or every-frame paint.
The adaptive scenario measures an independently constrained native parent,
switches finite row/stack variants, checks hysteresis and explicit text-scale
inputs, and preserves child host identity. Readiness uses the same one-logical-unit
tolerance as geometry assertions because Android rounds dimensions to device pixels.

The runner saves `evidence/results.json`, `build.json`, `screen.png` and `logcat.txt` in its
temporary workspace. Success requires the pinned Fabric/Hermes runtime, every
automatic scenario, and a real device press/release gesture. A scenario's
`complete` result alone does not pass the command. See
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

## Static analysis

The acceptance app's React Doctor scan has zero errors. Remaining warnings are
about external report delivery from an effect, the imperative viewport adapter's
`Dimensions.get` reads, and a Babel-runtime option that the scanner does not
recognize when its value comes from the installed package manifest. The preset
receives that exact pinned runtime version. A viewport adapter is not a React
hook, and its explicit Dimensions subscription handles changes. No blanket
suppression hides these diagnostics.
