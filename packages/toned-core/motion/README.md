# Portable host motion

`@toned/core/motion` animates committed Toned host outputs through the existing
differential writer. It does not create a second owner of native styles, DOM
styles or classes. `defineAnimations` remains the CSS named-keyframe vocabulary;
this module provides transitions between committed values on web and native.

```ts
const motion = attachMotion(host, {
  properties: ['opacity', 'width'],
  transition: { type: 'spring', stiffness: 170, damping: 26 },
  enter: { opacity: 0 },
  exit: { opacity: 0 },
  reducedMotion: true,
})
// Toned variant/state updates now transition these properties without rendering.
// Retain host until the exit completes; removing it first cancels the animation.
if (await motion.exit() === 'finished') removeHost()
motion.dispose()
```

Call `attachMotion` after Toned's host attachment, from a committed ref or layout
phase. React applications use `useMotion` from `@toned/react/motion`, passing its
`ref` to a Toned part. Keep the options object stable with a module constant or
`useMemo`: changing its identity replaces the controller, cancelling its current
transition. A normal host with no Toned attachment is diagnosed.
There is exactly one motion controller per host, after all controller and caller
precedence has been resolved. Caller-owned values continue to win.

The supported vocabulary is the exported `motionProperties` list (opacity,
physical dimensions, insets, spacing and border radius).
`supportsMotionProperty` provides a capability check. Configured targets must
resolve to finite numbers on native; percentages and arbitrary CSS expressions on
native are rejected. Web interpolates finite numbers/pixel lengths. Valid computed
values such as `auto`, `normal`, percentages and multi-value shorthands jump to
their committed declaration without interpolation. Returning from such a value
to a numeric target also jumps, since no numeric starting point is available.
Colors and transforms are outside the supported property vocabulary. Unconfigured
fields still update normally.
On web, computed styles resolve generated classes and CSS custom properties;
Toned temporarily writes the target during the same commit, samples it, and
restores the current animated value before paint. At completion, temporary inline
samples are removed so generated CSS regains control. CSS-only pseudo/media
changes that never cause a Toned host output are not observed: use Toned runtime
condition evaluation for those animated conditions. This avoids a polling observer
or a second CSS transition engine.

Timing accepts `duration` in milliseconds and an optional easing function.
Springs accept positive `stiffness`, `damping`, `mass` and `maxDuration` (default
10 seconds). An exact damped-oscillator solution performs bounded work per field;
interruption retains current position and velocity. Timing interruptions start
from the current visible value. Missing native fields reset immediately through
the registered host adapter instead of interpolating to an invented zero.

A controller schedules at most one animation frame and stops at rest. Same-host
ref handoffs preserve entry, transition and exit progress. Final detachment and
disposal cancel scheduled work, including stale callbacks. Disposal
never writes to a possibly reused host. Call `finish()` first when deliberately
removing motion from a still-mounted host and wishing to settle at its target.
Exit requires application-level presence retention; an exit interrupted by actual
host detachment resolves `cancelled`, while a completed exit resolves `finished`.
Committed target changes during exit are retained but do not reverse the exit.

`reducedMotion` accepts a boolean or a subscribable source. Setting it true settles
an active transition immediately. `webReducedMotion(window)` adapts the browser's
preference; construct it during client setup, not during server rendering. Native
applications can supply their AccessibilityInfo-backed preference store using the
same `current/subscribe` contract. Disposal removes that one subscription.

Native motion uses the registered `NativeHostAdapter.patch` pathway and JS frame
callbacks. It is functional with declared React Native hosts that support those
properties, but does not claim UI-thread animation, Reanimated integration or
certification for every RN version. A renderer-specific frame scheduler may be
injected with `frames`; it must keep timestamps in the same millisecond clock as
`now`, must return cancellable handles, and must deliver callbacks asynchronously.
Non-finite timestamps, easing results and unrepresentable spring values are
diagnosed and cancel the transition rather than leaving a frame loop running. This seam controls scheduling only;
all style writes still go through Toned's writer.
