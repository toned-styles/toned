# Portable compilation and explanations

`@toned/core/core` exposes `compilePlan`, `resolvePlan`, `foldOperations`, and
`explain`. Normal compilation is shared by immutable stylesheet identity and
platform. It decodes author-facing query keys into structured variant, media,
container, state, platform, and relation facts once. Occurrence order and
precedence layers stay separate from predicate identity.

The controller's compatibility matcher and portable compiler share one runtime
normalization for each declaration and cascade mode. CSS-condition lowering keeps
its own spelling adapter because symbolic browser conditions differ from runtime
facts. Matcher preparation/cache ownership lives under `stylesheet/matcher`; the
controller only requests the prepared matcher. Standalone matcher construction
still reads its inputs afresh.

Portable plans are shared by both authored and platform-prepared rule identities,
so compiling a sheet for diagnostics and mounting it do not construct the same
platform plan twice. Preparing a resolved grid tree again is identity-preserving.
The normalization cache uses weak declaration keys and four cascade/platform-mode slots;
portable plans additionally separate system identity and platform. These caches
contain no host or request state. Platform predicates are reduced before collecting
controller state/relation requirements, so a web-only relational branch cannot
require native topology support. Negation and OR retain that static reduction;
queries that become unconditional keep their authored precedence/provenance.
Sheets without platform atoms inside Boolean queries share their normalization
across platforms when the prepared declaration identity is the same.

Variant composition prepares effective declared defaults only when a referenced
source or kind comparison needs them. Ordinary variant callbacks do not merge
base/override defaults, and nested query groups do not clone inherited part maps
until a composition reference needs that scope. Required source preparation is
memoized within the authoring call; same-kind checks, override tombstones and
nested metadata validation remain unchanged.

A plan has named parts, part kinds, ordered token declarations, and declaration
origins. It contains no generated class names, selector strings, CSS variable
chains, host nodes, or live subscriptions. Opaque grid/selector/class extensions
are recorded as capability requirements, with their payloads left at the CSS
adapter boundary. Portable renderers reject those requirements rather than
silently dropping them. Ordinary web-specific `$style` values remain authored
values, not generated CSS mechanisms.

Token resolution produces ordered field writes. CSS, native, and Tailwind use the
same token evaluator, including alpha handling. A token that declares a
`properties` footprint is checked against the actual fields it produces; the
compiler never executes placeholder probes to guess its behavior. Native and
Tailwind resolution do not call the CSS executor. CSS lowering lives under
`backends/css`, including compatibility with atomic classes and legacy cascade
rules. The legacy `exec` surface delegates to that adapter.

```ts
const report = renderer.explain(button, {
  variants: { size: 'small', accent: true },
  facts: { 'Root:hovered': true },
})
// report.parts.Root.gap: value, winner, ordered competing writes
// report.output: the actual backend prop bags
// report.diagnostics: statically provable shadowed fields
```

Origins identify the stylesheet content, part, declaration path, token,
occurrence, and override layer. File/line/column are not fabricated: runtime
JavaScript objects do not carry that information. An optional future source
extractor can attach source locations without changing evaluation semantics.

Development stylesheet construction reports provable finite subset shadows.
For example, a later `size(s, m)` declaration shadows an earlier
`size(s).accent(true)` write to the same field. Unknown resolver footprints and
general Boolean implication are not guessed. Diagnostics explain source order;
they do not reorder intentional overrides.

`resolvePlan(..., { evaluate: false })` preserves every declaration branch for a
build inventory. `{ preserveConditions: true }` retains browser media,
container, and local-state predicates even when a render supplied a snapshot of
those facts. Cross-part and registered-part relations remain host facts. An
optional `part` uses a precompiled part index, avoiding scans/resolution of other
parts during direct updates.

Null in an authoritative override removes the inherited declaration at the same
path before predicate compilation. A base `gap: null` removes the inherited base
gap; removing a variant gap names that variant's path. It does not erase every
variant or emit CSS `initial`. `undefined` inherits. Other tokens writing the
same field remain eligible to win.

## Portable values and logical layout

Token resolvers can return `dp(8)`, `percent(50)`, `rgba(20, 40, 60, 0.5)` and
`themeRef<Theme>()('accent')`. They are immutable data, lowered by the shared
field evaluator before any CSS/native/Tailwind serialization. Theme references
resolve against the selected theme; missing keys and reference cycles fail.
Plain numeric/string resolver output remains compatible. Structured values belong
to token resolver output; `$style` retains its checked literal style vocabulary.

A descriptor may declare `layout: { direction: 'rtl', writingMode: 'horizontal-tb' }`.
Defaults are explicitly `ltr` and `horizontal-tb`; inherited host CSS does not
change this contract. The host must use the matching direction/writing mode;
this metadata defines field mapping and does not set text layout on the host.
Logical padding/margin/inset, border edges and sizes expand
in declaration order before field conflicts are settled. Physical declarations
retain physical intent. Layout is part of the immutable build schema: use a
separately built system for a different direction/mode. CSS supports horizontal
and vertical modes; the native profile rejects vertical logical layout until its
host supports writing mode. This does not emulate vertical text layout on native.

`dp()` is also accepted for fixed media/container thresholds and web grid tracks.
It never reads the theme spacing scale; percentage thresholds are rejected.
