# @toned/core

Toned declares a typed design vocabulary, named parts, variants and conditions.
The matcher compiles declarations once; output backends resolve them; mounted
hosts own direct updates. React is a separate integration.

## Declare a system

```ts
import { defineSystem, defineToken, type Variants } from '@toned/core'

export const ui = defineSystem({
  id: 'example',
  tokens: {
    bgColor: defineToken({
      values: ['primary', 'primary-hover'],
      resolve: value => ({ backgroundColor: value === 'primary' ? '#2563eb' : '#1d4ed8' }),
    }),
    opacity: defineToken({ values: [0, 0.5, 1], resolve: value => ({ opacity: value }) }),
  },
  conditions: {
    media: { md: 768 },
    containers: { field: { wide: 448 } },
  },
})

type ButtonVariants = { size: 's' | 'm'; variant: 'accent' | 'quiet' }

export const button = ui.stylesheet(q => ({
  Root: {
    $kind: 'pressable',
    bgColor: 'primary',
    [q.state('hover')]: { bgColor: 'primary-hover' },
    '@platform web': { $style: { cursor: 'pointer' } },
  },
})).variants(($: Variants<ButtonVariants>, q) => ({
  [$.size('s').variant('quiet')]: {
    Root: { opacity: 0.5, [q.media('md')]: { opacity: 1 } },
  },
}))
```

Keep token properties camelCase and named values kebab-case. A semantic
`typography: 'body-small'` token can resolve several fields; the core does not
force a CSS vocabulary. `$kind` is static metadata (`view` by default), `$style`
is low-level styling, `@` introduces a query, and `:` introduces a state.
Conditional rules inherit the part kind and cannot change it.

`$style` is a portable property/value intersection. Inside `@platform web` it
accepts web CSS types; inside `@platform native` it accepts the declared native
style subset for that part kind. Foreign platform blocks are filtered before
capability validation. Portable raw styles exclude `lineHeight` and numeric `flex`
shorthand because their web/native meanings differ; use semantic typography or
explicit flex fields, or a platform block. Native `textAlign: 'auto'` also stays
in its platform block. Legacy `$$type`, `style`, `@md`, `@field/wide`, and
`@platform.web` remain compatibility spellings. New code should use canonical
metadata and explicit platform scopes for platform-specific styles.

New descriptor systems use fixed logical pixels for both viewport and container
thresholds. Numeric logical lengths are accepted; font-relative, theme-relative,
negative and nonfinite thresholds are rejected. Legacy `defineSystem(tokens,
config)` retains its spacing-scale container behavior for migration.

## Conditions and precedence

The finite builders `q.state`, `q.media`, `q.container(name, step)`,
`q.part(name).state`, and `q.platform` return literal keys. Human aliases include
`:hover`, `@media md`, `@container field wide`, and `@platform web`.
Query builders are bound to their system: use the callback's `q` (which also
knows declared part names) or that system's `ui.q`. Compound platform predicates
filter execution but keep `$style` portable. Nest an explicit
`[q.platform('web')]` or `[q.platform('native')]` block to widen its style types.

Use the same computed-key form for compound queries, including inside a part:

```ts
const emphasis = ui.stylesheet(q => ({
  Root: {
    opacity: 1,
    [q.not(q.any(q.media('md'), q.state('hover')))]: { opacity: 0 },
  },
}))
```

The earlier standalone `bp`, `cq`, `and`, `or` and `not` builders are isolated in
`@toned/core/compat`; new declarations use the system-bound `q` methods. Old
`cq(name).min(number)` values used a system's spacing scale. When migrating to
`q.container(name, dp(number))`, supply the resolved logical width: 100 legacy
units at the default 4px base become `dp(400)`. Named steps retain the owning
system's declared threshold through `q.container(name, 'wide')`.

Compound builders produce self-contained deterministic keys; they do not allocate
registry IDs or normalize Boolean expressions into an exponentially growing DNF.
Pass operands inline or as a readonly tuple so TypeScript retains the expression
and can validate every referenced part. Arbitrary runtime arrays lose that exact
key information and are not accepted by checked declarations. Each expression is
bounded to 512 nodes and 64 KiB and fails explicitly if it exceeds either limit.
A bare `q.state(...)` binds to its enclosing part; sheet-level groups use
`q.part('Root').state(...)`. The direct cross-part shorthand selects one source;
use `q.all` or `q.any` for compound cross-part conditions.
An axis builder can be reused as a direct variant key and as an operand in
`q.all`, `q.any` and `q.not`; reading an operand does not declare another rule.
Compound query keys are primitive strings. Repeating the same complete key in
one object follows JavaScript's last-key-wins behavior, including in variants and
overrides; merge its body instead. TypeScript rejects duplicates when their keys
are statically known, but cannot catch every dynamically computed key. The direct
axis-builder duplicate guard cannot detect this after object construction.
Counting query construction would also
reject valid reuse of one condition in separate parts or larger expressions.

The experimental curried `.variants<Mods>()(factory)`, `q.rules(...)`, and
`.when(...)` forms are removed. Annotate the single `.variants` callback and put
compound conditions directly in its returned objects. Existing main-branch
explicit-generic callback and object variant declarations remain compatible.
The experimental branch's public object-predicate types `QueryAtom` and
`QueryPredicate` are removed; they were never part of main's public API. The
internal `WHEN_RULES` metadata protocol is also removed. Query builders now
return typed `QueryKey` strings; consumers use those keys in declarations instead
of assembling predicate objects or attaching conditional-rule metadata.

In descriptor systems, later matching declarations within a precedence layer win
each resolved field. Legacy systems retain their historical pseudo/breakpoint
order within a layer; a higher override layer still wins over the whole lower layer.
A compound variant has no implicit specificity bonus. Use `.variants(($: Variants<Mods>, q) => ({ … }))` to infer the schema and
check the complete returned declaration, including excess keys in nested rules.
The callback offers part, token, variant-value and system-query completions.
Re-export the type from your design-system module to write `ui.Variants<Mods>`
with a namespace import (`import * as ui from "./ui"`). Reusable type aliases and interfaces both work, including optional axes.
The annotation has no runtime cost. Literal rule keys are checked against declared
axes and values, including combined attributes, named fragments and condition
aliases. A misspelled literal remains an error beside a computed selector.
TypeScript can widen arbitrary dynamically computed keys to a string index; their
spelling cannot then be proved. Use `$.axis(value)` and the query builders for
computed keys so arguments are checked before that widening occurs. Place
platform-specific styles inside the variant's part or condition group: mixing a
separate top-level platform rule with widened computed variant keys loses the
key-to-host association needed to validate its raw styles.
The main-compatible explicit-generic direct callback and object signatures remain
compatible; the explicit-generic direct callback cannot catch every excess property.
**Migration note:** callbacks without explicit method type arguments now use the
checked overload, including callbacks annotated with the existing `VariantSelector`.
Previously accepted excess keys are rejected. Keep an extracted factory's result
literal (for example `return { ... } as const`) so finite token values do not widen
to `number` or `string`; inline callbacks receive that context automatically.
Overload errors can mention `VariantsInput`, the final compatibility signature;
check the callback's declarations and literal values first. The checked signature
must precede compatibility signatures to provide literal context: moving it last
widens otherwise valid inline token and fragment values. Removing those signatures
would break callers on main. This diagnostic limitation remains while those calls
are supported. The stricter inferred callback behavior is an intentional
type-checking change.
Variant keys are canonical
literal strings at runtime and in TypeScript, including multi-value selections.
The matcher keeps a fast unsigned single-word path and uses multiple words beyond
32 allocated values. Equality uses exact rule membership and output operations,
not a lossy XOR hash. Caches are bounded and compiled plans are shared.

## Reuse named fragments and part declarations

Declare a named fragment with `[$('interactive')]` inside the same variant
callback and apply it with `$compose: 'interactive'` at rule level. The annotated
callback infers the exact names for completion and rejects unknown names, including
references inside other named fragments. Arrays compose from left to right; the
rule's own declarations apply last. Named fragments do not create variant matches.

Inside a part declaration, `$compose: 'Label'` instead refers to a declared part.
The source comes from the same rule when present, otherwise from the sheet's base
part declarations. Derived sheets use their effective declared defaults, including
prior overrides and null removals, when copying base parts. Explicitly typed parts can compose only from the same kind,
so composition cannot move text-only styles or kind-restricted tokens into views.
Legacy unspecified kinds retain their previous permissive behavior. Composition
copies styles, not the source part's `$kind`.

Declared part names (and their `$Part` aliases) are also reserved as nested target
keys by the legacy declaration grammar. A token cannot share one of those names
at that position; its object payload would be interpreted as a target declaration.

Part and named-fragment references resolve transitively. Unknown references and
cycles throw during stylesheet construction, including in unused named fragments;
untyped callers cannot silently lose styles. A composed source remains an ordinary
part that can be rendered independently. The same composition rules apply inside
media, container, cross-part, compound-query and platform groups. Put the condition
around a part map when composing under that condition; `$compose` nested inside an
individual part's condition block is rejected. Root query groups must name their
source part (`q.part('Root').state('hover')`); local `q.state('hover')` belongs inside
that part's declarations.

## Build CSS before rendering

```ts
// Build script; include lazy stylesheet declarations explicitly.
import { buildStyles } from '@toned/core/build'
const { css, manifest } = buildStyles(ui, { sheets: [button, emphasis], layer: 'components' })
// Write css to an application asset and manifest to a generated module.
```

Deliver the asset before first paint. Namespaced systems prefix generated classes,
condition variables and keyframes with their ID. Theme variables consumed by such
a system must use the same namespace; `namespaceCss` in the system subpath can
namespace a generated palette. Application-provided external CSS is not discovered. Resolver implementation
changes still require rebuilding the CSS asset; schema validation is not a source-code hash.
The build manifest records ad-hoc conditions and the exact static system schema,
including named query thresholds, alpha channels/steps, token applicability and pseudo-rule presence. A pure web renderer rejects a changed schema
or an undeclared condition with a regeneration instruction; it never injects a rule.

`@toned/core/build` contains generators only. `@toned/core/dev/inject` is an
explicit optional development tool. The old `dom` entry remains compatible.
The Vite plugin serves `virtual:toned.css`; import it explicitly, supply watched
`inputs`, and pass the complete system ref with a `sheets` collector, e.g.
`toned({ system: ui, sheets: () => [button], inputs: ['./button.ts'] })`.
It delegates to the same build path and exposes the paired manifest through
`virtual:toned.manifest` (a default export). Both modules share one collection per
build or watched invalidation. The older raw `system.system` option remains
compatible, but requires an explicit namespace `id` and condition collector;
it cannot collect sheets or check their runtime namespace.
It no longer inserts an extra style node into HTML implicitly.

Publish CSS and its manifest together. `assertBuildArtifact({ css, manifest })`
checks the original generated asset's fingerprint before publication; after
minification, hash the final delivery bytes in the application's asset pipeline.
The pure renderer does not fetch or inspect served stylesheets, and a manifest
alone cannot prove which asset a browser loaded. The fingerprint is a content
identifier for accidental drift, not a security digest. Changes inside `resolve`
or `pseudoRules` functions require rebuilding assets; schema checks track function
presence, not function source or captured values.

## Pure server and alternative output

```ts
import { createWebRenderer } from '@toned/core/server'
const web = createWebRenderer(ui, { manifest })
const props = web.resolve(button, { variants: { size: 's', variant: 'accent' } })
// <button {...props.Root} /> works in an RSC/server entry: no hooks or refs.
```

Web renderers default to CSS custom-property references (`var(--name)`). Explicit
`tokens` override those defaults. Each renderer exposes `t` for lightweight token
composition using that renderer's backend and immutable tokens:

```ts
const props = web.t({ padding: 2 }, { $style: { opacity: 0.8 } })
```

When a token helper must exist before CSS generation (for example in a declaration
module imported by the CSS inventory), use the standalone explicit constructor:

```ts
import { createTokenStyles, cssVariableTokens } from '@toned/core/server'
export const t = createTokenStyles(ui, {
  tokens: cssVariableTokens(), platform: 'web', useClassName: true,
})
```

It requires no manifest and reads no installed global config. It does not generate
or deliver CSS; the application's build still owns the classes it requests.
`cssVariableTokens()` returns a frozen null-prototype token proxy preserved through
immutable snapshots. Use concrete token values for native output. `renderer.t` is
an ergonomic shortcut using the renderer's selected backend; it validates required
build conditions. Both helpers retain the same typed composition and symbol protocol
as legacy `system.t`, which remains available for consumers using installed config.
Helpers are explicit snapshots and do not subscribe to provider theme changes.
For recursively immutable declaration/token data, `style` and `className` share
one lazy resolved output, including when spread into props. Opaque class instances
and function values retain their identity and disable this caching, so valid
mutable payloads remain observable. Legacy `system.t` continues reading its live
installed context on each getter access.

`createNativeRenderer` evaluates the same declarations with explicit host facts
and rejects fields outside its documented finite native profile. Unsupported CSS
properties and values fail visibly instead of reaching a native host silently.
`createRenderer` accepts an output backend. Define exact field/value mappings and
fixed parameter utilities with `createTailwindBackend` from `@toned/core/backends`.
Then call `buildTailwind(ui, profile, { sheets, tokens, source, compile })` from
`@toned/core/build`, passing the application's actual Tailwind `compile` function
and configured CSS source. Deliver its CSS and JSON manifest together. Runtime
code uses `createTailwindRuntime(ui, profile, manifest)` to restore the backend
without importing Tailwind or generating CSS. The build validates every collected declaration
and declared theme, compiles complete candidates (including lazy sheets), and checks
that each utility writes exactly its promised property and value.

The built adapter preserves local states, media/container queries and boolean
conditions using precompiled helper gates and fixed utility parameters. It consumes
the shared ordered field plan, so class-attribute order cannot change a winner.
Cross-part facts use the mounted host registry. Runtime token/theme values use
explicit parameter serializers; rendering never compiles or injects CSS. Classes-only
profiles accept finite runtime choices and reject browser-conditional fields that
need a parameter channel. Unresolved CSS expression equivalence is deliberately
rejected: `gap-3` on a rem scale is not established to mean twelve pixels.
See [the backend contract](backends/README.md) for capabilities and validation.
An unbuilt profile is a low-level mapping/formatting helper. Pure renderers and
mounted hosts reject it until `buildTailwind`/`createTailwindRuntime` binds its
validated asset; supplying an unrelated CSS manifest cannot bypass this gate.

`ui.style(declaration)` is a pure immutable declaration helper. `ui.t(...)` is the
supported shorthand for lightweight token-to-style resolution and composition:

```ts
const base = ui.t({ padding: 's', $style: { opacity: 0.8 } })
const compact = ui.t(base, { $style: { minHeight: 24 } })
// compact.style and compact.className resolve when read.
```

Later arguments override earlier token values; raw `$style` fields merge across
arguments. The main-compatible `style` spelling and composed `t` results remain
accepted. `t()` normalizes its inputs immediately and snapshots raw style fields;
mutating a caller style object later does not change a retained result. Invalid
metadata (such as a conditional `$kind` or conflicting kind aliases) throws
when `t()` is called, including during module initialization. Direct `exec` still
observes its input values on each call. Getters read the installed configuration's current tokens, platform and
class mode. They call no hooks, create no subscriptions and do not read a React
provider: merely retaining a bag does not update a mounted host when tokens change.
Web CSS-variable values can follow CSS theme changes; native literal values must
be resolved again and applied when the theme changes. Use `useStyles` or
`createElements` for mounted lifecycle ownership, states and related parts.

No global installation is needed for explicit resolution. The existing
`ui.exec({ tokens, platform: 'native', useClassName: false }, declaration)` accepts
per-call tokens for a single declaration. For sheet defaults, variants, host facts,
manifest validation and alternative backends, use the pure renderer above with
`ui.stylesheet({ Root: declaration })`. These paths do not consult the installed
configuration; avoid changing global configuration for each server request.

## Typed web grid

```ts
import { defineGrid, dp, fr } from '@toned/core'
const message = defineGrid('message', {
  columns: [dp(48), fr(1)],
  areas: [['avatar', 'title'], ['.', 'body']],
})
const sheet = ui.stylesheet({
  Root: { '@platform web': { $grid: message } },
  Avatar: { '@platform web': { $area: message.area('avatar') } },
  Title: { '@platform web': { $area: message.area('title') } },
  Body: { '@platform web': { $area: message.area('body') } },
})
```

Areas infer their names, exclude `.`, retain definition identity, and compile to
local CSS area names. Numeric placements remain available as area metadata. Construction checks rectangular regions, track counts,
and finite lengths. Hosts validate direct layout parentage and isolate repeated
grid instances. Multiple occupants intentionally overlap in source order. Grid
is enabled on web; native use throws a capability error. A web-scoped grid can
have an ordinary shared/native fallback. No measured JavaScript grid solver is
installed; native support awaits a verified integrated layout engine.

Create complete responsive plans with `message.variant(...)`:

```ts
const compact = message.variant({
  columns: [fr(1)],
  areas: [['avatar'], ['title'], ['body']],
})
const responsive = ui.stylesheet({
  Root: {
    '@platform web': {
      $grid: compact,
      [ui.q.media(dp(600))]: { $grid: message },
    },
  },
  Avatar: { '@platform web': { $area: message.area('avatar') } },
  Title: { '@platform web': { $area: message.area('title') } },
  Body: { '@platform web': { $area: message.area('body') } },
})
```

The alternative matrix must contain exactly the original named areas; missing
or invented names fail both typing and runtime validation. Tracks and area
positions may change, including through container queries or component variants.
Area references from either plan work throughout the same family. Generated CSS
moves the existing children before hydration, so resize needs no JavaScript
measurement, host write, React render, or reparenting. Repeated grids independently
follow their own container. Every plan emits its complete geometry: omitted rows
use `auto`, and an omitted gap resets to `0`. A spacing token declared after
`$grid` can override that plan's gap through ordinary declaration order.

Each part needs an unconditional `$grid`/`$area` registration. Conditional geometry
must belong to that same family: a query cannot introduce a different ownership
boundary. Declare one base plan and vary it with `.variant(...)`; for visibility,
keep its areas and apply conditional `display`. This keeps ownership validation
stable even when the browser alone evaluates a condition. It deliberately rejects
a condition-only grid registration instead of silently skipping host checks.


## Source map

- `system/`: definitions, normalization, predicate lowering, namespaces.
- `stylesheet/matcher/`: bitsets, ordered rules, selector and predicate compilation.
- `stylesheet/StyleSheet.ts`: immutable plan construction and mounted controllers.
- `stylesheet/applyStyles.ts`: ownership-aware host patching and stale-field reset.
- `backends/`, `server/`, `build/`: output, pure resolution and build delivery.
- `grid/`: geometry compilation and host identity checks.

Tests cover bit boundaries, reference evaluation, zero/conditional properties,
selector types, suspended React work, ref cleanup, theme updates and owned native
patches. The HQ integration adds real-browser first-paint and showcase gates.
A fixture is not certification of a React Native/Fabric device integration.


## Variant defaults and alpha

The fully checked factory takes defaults without widening axis values:
`.variants(($: Variants<Mods>) => ({ … }), { defaults: { size: 'm' } })`. Defaulted axes are
optional at consumption; explicit `undefined` selects the default. Other axes
stay required. Defaults survive derived sheets and override layers and resolve
identically through the pure renderer and mounted hooks.

Use `alpha('primary', 0.2)` for a token declaring `alphaChannel`. It retains the
base name in its type, validates a finite fraction in the inclusive `[0, 1]`
range, and lowers to the existing slash representation. The `'primary/20'`
spelling remains compatible. Zero multiplies the source alpha by zero; one
preserves it, including already translucent literals. Named values on tokens
without an alpha channel do not accept the helper's result.

`definePalette` requires complete per-theme maps or an explicit `fallbackTheme`.
The fallback must name a declared theme and supply every otherwise missing value.
The default theme selects the initial CSS scope; it is not an implicit fallback.
Invalid coverage fails at declaration, and palette snapshots are immutable.

### Logical relationships and web selectors

`q.part('Root').has('Item', 'checked', { scope: 'descendant' })` is a semantic
condition key accepted directly in declaration objects and boolean query composition. The default scope
is `descendant`; `child` means the immediate **registered part** parent, not every
intermediate host wrapper. Each mounted controller family owns its part graph.
Targets in another stylesheet instance never contribute facts. Web ancestry uses
registered DOM ancestry; portals without an ancestor in that graph do not match.
Native integrations explicitly supply topology and semantic state capabilities.

Mounts, unmounts, moves and state transitions update the graph and matching facts
without a styling render. Web observers are shared per document and released when
the final subscriber leaves. Native relations require `parentOf` and
`subscribeTopology`; semantic states beyond hover, active and focus additionally
require `readState`. Unsupported host capabilities throw named errors.

Use `$webRules: webRules({ '&::before': { content: '"*"' } })` inside an explicit
`'@platform.web'` block for CSS selectors or pseudo-elements. Styles use checked
CSS property types. Each entry has one `&`-anchored selector; comma lists and
at-rules are rejected (write separate entries or use typed queries). Exact DOM
child syntax such as `& > input:checked` belongs here, distinct from the portable
registered-part relationship. The generated CSS belongs to the normal build
artifact, and native resolution must never silently interpret it as native style.

## Pure authoritative overrides

`overrideSheet(sheet, rules, variants?)` creates an immutable higher-priority
layer without React, provider context or token reads. It preserves the sheet's
part kinds, axes and defaults, and accepts the same typed query builders.

```ts
const compact = overrideSheet(button, { Root: { padding: null } }, $ => ({
  [$.size('s')]: { Root: { padding: 4 } },
}))
const artifact = buildStyles(ui, { sheets: [button, compact] })
const web = createWebRenderer(ui, { manifest: artifact.manifest, tokens })
const props = web.resolve(compact, { variants: { size: 's' } })
```

Collect derived sheets before building when they introduce conditions or other
CSS structure. Pure/native renderers resolve these layers directly; React hooks
and element families consume the derived sheet, while ambient React scopes use
the same composition operation. `null` removes an
inherited leaf at that exact path before matching; it does not erase a separate
variant declaration. `extend` remains ordinary derivation instead of an
authoritative override layer.

### Theme schemas in token authoring

Bind a theme schema once with `defineTokenFor<Theme>()`; finite values and dynamic
channels retain their ordinary inference. Resolver callbacks can only read fields
in that schema. A descriptor system checks every declared theme against the
combined requirements of its typed tokens, including tokens from several libraries.

```ts
type Theme = { colors: { primary: string }; spacing: number }
const token = defineTokenFor<Theme>()
const gap = token({
  values: [0, 1, 2],
  dynamic: 'number',
  resolve: (value, theme) => ({ gap: value * theme.spacing }),
})
const ui = defineSystem({
  id: 'typed-theme',
  tokens: { gap },
  themes: { daylight: { colors: { primary: '#246' }, spacing: 4 } },
})
```

This is static schema checking, not validation of untrusted JSON. Applications
validate external theme data before passing it to a renderer. Existing untyped
`defineToken` remains compatible; adopting the typed factory is incremental.

Fixed query thresholds can also be colocated at the use site:

```ts
const layout = defineSystem({
  id: 'local-queries', tokens: {}, conditions: { containers: { card: {} } },
})
layout.stylesheet(q => ({
  Root: {
    [q.media(dp(600))]: { $style: { opacity: 0.8 } },
    [q.container('card', dp(300))]: { $style: { opacity: 1 } },
  },
}))
```

The container name must be declared in the system; its threshold may be local.
These keys retain exact literal types (`@>=600px`, `@card/>=300px`) and compose
with `q.all`, `q.any`, and `q.not`. Mix variants into these expressions through
checked selectors such as `$.size('s')`; unchecked raw `'[size=s]'` operands are
rejected by the query helper types. Both host evaluators and generated query
preludes use the same fixed pixel number. Percentage, font-relative, and
custom-property thresholds are rejected. Include sheets containing these
queries in the normal build inventory, including lazy or overridden sheets.
Typed-theme systems also check renderer construction and per-resolution
`tokens` against their declared schema.

Build validation rejects named conditions that collide with another condition's
generated toggle identity, including a named container step such as `gte300px`
beside a local `dp(300)` query. Rename that step instead of publishing ambiguous
CSS. Fixed viewport toggles use a separate namespace from named breakpoints.

`defineTokenFor` defaults to `PortableTokenStyle` for resolver output. Both field
names and values are checked, including extra keys beside valid fields. Structured
lengths belong to dimensional fields, structured colors to color fields, and
`themeRef<Theme>()` retains the referenced value type. An opacity cannot receive
`dp(1)` or a reference to a string-valued theme entry.

Platform-specific resolvers state their output contract explicitly:

```ts
const webToken = defineTokenFor<Theme, WebInlineStyle>()
const sticky = webToken({
  values: ['top'],
  resolve: () => ({ position: 'sticky', top: 0 }),
})
```

`NativeInlineStyle<'view'>` is another valid explicit contract and retains kind
restrictions. An explicit output type describes the selected host vocabulary;
backend capability validation still applies. Legacy `defineToken` retains its
broad output contract for incremental migration.

### Portable motion

`@toned/core/motion` adds timing and spring transitions to committed Toned host
outputs, sharing the existing differential writer and ownership rules. It supports
numeric native targets, computed pixel/numeric web targets, interruption, reduced
motion, entry and retained-host exit. See the [motion contract](motion/README.md)
for the finite property vocabulary, lifecycle rules and native JS-thread boundary.
React's committed ref adapter is `useMotion` from `@toned/react/motion`.
