# Adaptive layouts

Adaptive layouts declare a finite set of portable stack, row, or wrapping layouts.
A store selects one from independent measurements and returns an ordinary typed
variant bag. The existing stylesheet compiler, `useStyles`, and `createElements`
apply the styles. There is no second renderer or imperative child rearrangement.

```tsx
import * as React from 'react'
import { defineAdaptiveLayout, createAdaptiveStore, type AdaptiveLayoutName } from '@toned/core/adaptive'
import { observeAdaptiveContainer } from '@toned/core/adaptive/web'
import { useAdaptiveVariants } from '@toned/react/adaptive'
import { createElements } from '@toned/react'
import type { Variants } from '@toned/core'

const adaptive = defineAdaptiveLayout({
  axis: 'layout', root: 'Root', areas: ['Title', 'Body', 'Actions'],
  fallback: 'stack',
  hysteresis: { size: 24, textScale: 0.1 },
  layouts: {
    stack: { flow: 'stack', gap: 8 },
    wide: {
      flow: 'row', gap: 12,
      when: { minWidth: 600, maxTextScale: 1.5 },
      areas: { Body: { grow: 1 } },
    },
    wrapped: { flow: 'wrap', gap: 8, when: { keyboard: 'shown' } },
  },
})
const sheet = ui.stylesheet({
  Root: {}, Title: { $kind: 'text' }, Body: {}, Actions: {},
}).variants(
  ($: Variants<{ layout: AdaptiveLayoutName<typeof adaptive> }>) => adaptive.rules($),
  { defaults: { layout: adaptive.fallback } },
)
const S = createElements(sheet)

function Card() {
  const [store] = React.useState(() => createAdaptiveStore(adaptive, { textScale: 1 }))
  const available = React.useRef<HTMLDivElement>(null)
  React.useEffect(() => {
    if (available.current) return observeAdaptiveContainer(store, available.current)
  }, [store])
  const variants = useAdaptiveVariants(store)
  return <div ref={available} style={{ width: '100%' }}>
    <S {...variants}><S.Root>
      <S.Title>Title</S.Title><S.Body>Body</S.Body><S.Actions>Actions</S.Actions>
    </S.Root></S>
  </div>
}
```

The same bag works with `const s = useStyles(sheet, useAdaptiveVariants(store))`.
Store selection does not write to hosts. It publishes a new immutable variant bag
only when the chosen layout changes; React commits through the existing Toned
integration. Measurement changes that keep the selected layout do not rerender
subscribers. Create a store per independently measured instance, outside render
or in a state initializer. The hook manages subscription cleanup and deterministic
server snapshots; SSR and hydration begin with the declared fallback even when a
client store already has measurements.

## Measurements and ownership

The default source is `container`; `space: 'viewport'` selects `viewport` instead.
A missing chosen frame selects the fallback. Sources never silently substitute
for each other. Lengths use CSS pixels on web and density-independent units on
native. Inputs are explicit immutable snapshots:

```ts
store.update({
  container: { width: 640, height: 480 },
  textScale: 1.25, keyboardHeight: 200,
  safeArea: { top: 20, right: 0, bottom: 16, left: 0 },
  content: {
    Title: { width: 150, height: 32 },
    Body: { width: 280, height: 80 },
    Actions: { width: 120, height: 40 },
  },
})
```

`update` merges top-level fields; `content` and `safeArea` replace their whole
field. Explicit `undefined` clears a field. Text scale must be positive; all
other numbers must be finite and nonnegative. Unknown measurement/area names fail.

Observe an independently constrained **available-space parent**, never the
selected layout or content whose dimensions change when it is selected. Parent
width must come from its surrounding layout; a shrink-to-fit wrapper depending
on these children is also a feedback loop. For height conditions, constrain the
parent height independently too. The adapter cannot infer this ownership from a
DOM node. No adaptive API itself writes to the measured node or measures output.
Hysteresis filters boundary noise; it cannot repair a circular sizing design.

`observeAdaptiveContainer` observes that explicit element's content box and
returns cleanup. It waits for ResizeObserver's first delivery, retaining the
fallback or supplied initial measurements until then. `observeAdaptiveViewport`
uses `window.innerWidth/innerHeight` and resize events; it does not infer text
scale from browser zoom. Both clean up subscriptions and ignore queued callbacks
after cleanup. Missing browser APIs require explicit snapshots.

Native uses the same decision model and generated flex styles:

```tsx
import { nativeAdaptiveLayout } from '@toned/core/adaptive/native'
const onLayout = React.useMemo(() => nativeAdaptiveLayout(store), [store])
const variants = useAdaptiveVariants(store)
return <View style={{ width: availableWidth, height: availableHeight }} onLayout={onLayout}>
  <S {...variants}>...</S>
</View>
```

Supply native viewport, text scale, keyboard and safe-area snapshots from the
application's existing platform subscriptions; `nativeAdaptiveLayout(store,
'viewport')` can translate an independently sized viewport host instead. Cleanup
of those application-owned subscriptions remains with their owner. The native
adapter imports no React Native package and does not claim an arbitrary custom
renderer conforms to Fabric. The acceptance app exercises the pinned Fabric host.

Available width subtracts left/right safe-area insets; available height subtracts
top/bottom insets and keyboard height. Supply **occlusion of the provided frame**:
if a safe-area or keyboard-avoiding parent already reduced that frame, use zero
for that already consumed inset. Avoid subtracting the same space twice.

Intrinsic `content` inputs are externally measured natural extents at the current
text scale. They are never inferred from the selected output. With `content:
'fits'`, every declared area needs a measurement. Row sums widths, stack sums
heights, and wrap greedily packs rows in declared area order with gaps. A larger
explicit flex basis counts on the main axis. Fitting is conservative: it does not
rely on shrinking or predict text reflow. Update content and textScale together
when intrinsic metrics change. This is a finite constraint selector, not a second
text engine or a general-purpose constraint solver.

## Selection and guarantees

- Nonfallback candidates are tested in declaration order; the first eligible one
  wins. Fallback placement does not affect priority; fallback must be unconditional.
- Conditions bound width, height and text scale, require a shown/hidden keyboard,
  or require intrinsic content to fit. Missing explicit text-scale/keyboard data
  makes a candidate requiring that fact ineligible.
- Initial selection uses nominal bounds. Subsequent transitions enter at stricter
  bounds (minimum plus hysteresis, maximum minus hysteresis). The current candidate
  remains inside expanded exit bounds unless an earlier-priority candidate qualifies
  to enter. Width/height/content use `size`; text-scale bounds use `textScale`.
  Zero hysteresis gives ordinary inclusive comparisons. A retained layout can exceed
  a nominal content-fit bound by the configured tolerance; choose an appropriate size.
- At most 32 candidates and 128 distinct named areas are allowed. Names, numeric
  bounds, area references and unknown properties are validated. Declarations,
  measurements, variant bags and generated rules are immutable snapshots.
- Root and area names are stylesheet part names. Each area should be a direct child
  of Root, rendered once in declared order, for intrinsic fitting to describe the
  actual layout. The API never inserts, sorts, reparents or clones children.
- Root emits `display:flex`, `flexDirection`, `flexWrap` and `gap`. Areas emit
  `flexGrow`, `flexShrink` and `flexBasis`. Existing stylesheet precedence applies;
  avoid contradictory later variant rules. No CSS `order`, reverse direction,
  absolute placement or native grid is emitted.
- Static CSS production uses the existing build pipeline; adaptive declarations
  do not inject CSS. Named areas identify existing parts; flex placement does not
  implement CSS Grid area spanning on native.
