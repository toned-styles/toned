# Portable host motion

`@toned/core/motion` animates committed Toned host outputs through the existing
differential writer. It does not create a second owner of native styles, DOM
styles or classes. `defineAnimations` remains the CSS named-keyframe vocabulary;
this module provides transitions between committed values on web and native.

```ts
import { attachMotion } from '@toned/core/motion'

const motion = attachMotion(host, {
  properties: ['opacity', 'width'],
  transition: { type: 'spring', stiffness: 170, damping: 26 },
  enter: { opacity: 0 },
  exit: { opacity: 0 },
  reducedMotion: true,
})
// Toned variant/state updates transition these properties without rendering.
// Retain host until the exit completes; removing it first cancels the animation.
if ((await motion.exit()) === 'finished') removeHost()
motion.dispose()
```

Call `attachMotion` after Toned's host attachment, from a committed ref or layout
phase. React applications use `useMotion` from `@toned/react/motion`, passing its
`ref` to a Toned part. Keep the options object stable with a module constant or
`useMemo`: changing its identity replaces the controller, cancelling its current
transition. A normal host with no Toned attachment is diagnosed.
There is exactly one motion controller per host, after all controller and caller
precedence has been resolved. Caller-owned values continue to win.

The supported vocabulary is the exported `motionProperties` list, in three kinds:

- **Numbers:** opacity, physical dimensions, insets, spacing and border radius
  (`numericMotionProperties`).
- **Colours:** `color`, `backgroundColor` and `borderColor`
  (`colorMotionProperties`). They interpolate in Oklab with premultiplied alpha,
  so a midpoint is perceptually halfway and a fade to `transparent` keeps its hue.
- **Transforms:** `translateX`, `translateY` (pixels, or dp on native), `rotate`
  (degrees), `scale`, `scaleX` and `scaleY` (`transformMotionProperties`). Each is
  its own channel, so a press can scale while a panel slides.

`supportsMotionProperty` provides a capability check. Numeric targets must
resolve to finite numbers on native; percentages and arbitrary CSS expressions on
native are rejected. Web interpolates finite numbers/pixel lengths. Valid computed
values such as `auto`, `normal`, percentages and multi-value shorthands jump to
their committed declaration without interpolation. Returning from such a value
to a numeric target also jumps, since no numeric starting point is available.
Unconfigured fields still update normally.

Colour targets come from the committed output. A token colour therefore resolves
through the active theme: on web the computed style resolves the theme's CSS
variables, and on native the renderer's current tokens give the literal. Native
colours must be literals (hex, `rgb()`, `hsl()`, `oklab()` or `oklch()`); a
`var()` on native is diagnosed. `enter` and `exit` take a colour string, which may
be `var(--token)` on web, or a token style such as `ui.t({ bgColor: 'muted' })`,
read when the phase starts.

Transforms are layout-safe: they never change layout, and an absent transform is
the identity (translate 0, rotate 0, scale 1), so a transform can animate to or
from "no transform". On web, motion writes the individual CSS properties
`translate`, `rotate` and `scale`. These compose with an authored `transform`,
applied before it, and sheets declare their targets with the same properties in
`'@platform web'`. On native, motion writes the `transform` array. Its translate,
rotate and scale entries come first, before the committed entries, and a committed
`perspective` stays first. Targets are read from the committed `transform` array
in `'@platform native'`. On web, `translateX` and `translateY` share one CSS
property, so naming either animates both. The same holds for `scaleX` and `scaleY`.

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
certification for every RN version. Non-finite timestamps, easing results and
unrepresentable spring values are diagnosed and cancel the transition rather than
leaving a frame loop running. The clock controls scheduling only;
all style writes still go through Toned's writer.

## One clock

A `MotionClock` (`now`, `request`, `cancel`) is the frame scheduler and the
millisecond time base. Pass one clock to every motion in a tree, so a test, a
replay or Weft's UI runner steps all of it at once:

```ts
import { attachMotion, createTestClock } from '@toned/core/motion'

const clock = createTestClock() // 16 ms frames from time 0
attachMotion(host, fade, { clock })
attachMotion(other, fade, { clock })
clock.advance(100) // delivers each frame up to 100 ms; nothing sleeps
clock.frame() // one more frame
clock.pending // callbacks waiting for the next frame
```

`frameClock` is the browser default (`requestAnimationFrame` and
`performance.now()`). A renderer-specific clock must keep `now` and its frame
timestamps in the same millisecond base, return cancellable handles and deliver
callbacks asynchronously. React shares a clock through `MotionClockProvider` from
`@toned/react/motion`. A Weft run's deadlines read the same `clock.now()`, so after
`clock.advance(ms)` the runner's `tick(clock.now())` sees the same time as the
motion. The per-motion `frames` option is still accepted as that one motion's
clock, and it takes precedence over the context clock. New code passes `clock`.

## Transitions keyed by declared state

`defineMotion(system, spec)` declares motion against a system, so its transitions
can be keyed by the same declared states that style a part:

```ts
import { defineMotion } from '@toned/core/motion'

export const panel = defineMotion(ui, {
  properties: ['opacity', 'translateY', 'backgroundColor'],
  transition: { type: 'timing', duration: 150 },
  states: {
    ':open': { type: 'spring', stiffness: 300, damping: 30 },
    [ui.q.all(ui.q.state('open'), ui.q.state('saving'))]: {
      type: 'timing',
      duration: 600,
    },
  },
})
```

Keys are declared states, built-in states (`':hover'`, `':active'`, `':focus'`,
`':focus-within'`, `':focus-visible'`), or `q.all`, `q.any` and `q.not` of them,
written as in a stylesheet. An unknown state is a type error that names the
declared states, and the same check runs when `defineMotion` is called. When a
committed target changes, motion reads the active states, and the last entry
that matches picks the transition. `transition` is used when none matches. List
compound keys after the states they combine. A state change that changes no
motion property starts nothing.

Active states come from:

- **web:** the host matches each state's declared selector (`element.matches`).
  Attribute changes on the host itself are observed, so one `data-state` toggle
  starts the transition without a Toned write. States set elsewhere, such as on
  an ancestor, are read at the next Toned output.
- **native:** the host adapter's `readState`, followed through `subscribeState`.
  A host without `readState` is diagnosed.
- **a states source**, `attachMotion(host, panel, { states })`, where `states` is
  `{ current(): Iterable<string>, subscribe(listener) }`. A Weft binding passes its
  run's open waits here, so the protocol state that styles a part also drives its
  motion.

A system whose only targets are static (`targets: ['email']`, `['pdf']`) has no
host to animate. `defineMotion` is then a type error, and it also throws, naming
the fix: show the end state with a variant. Passing `states` straight to
`attachMotion` without `defineMotion` is a type error too, because no system is
there to check the names.
