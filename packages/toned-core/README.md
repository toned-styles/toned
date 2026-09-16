# @toned/core

Toned declares a typed design vocabulary, named parts, variants and conditions.
The matcher compiles declarations once; output backends resolve them; mounted
hosts own direct updates. React is a separate integration.

## Declare a system

```ts
import { defineSystem, defineToken } from '@toned/core'

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

export const button = ui.stylesheet(q => ({
  Root: {
    $kind: 'pressable',
    bgColor: 'primary',
    [q.state('hover')]: { bgColor: 'primary-hover' },
    '@platform web': { $style: { cursor: 'pointer' } },
  },
})).variants<{ size: 's' | 'm'; variant: 'accent' | 'quiet' }>()(($, q) => ({
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
Use advanced boolean expressions at sheet level:

```ts
const emphasis = ui.stylesheet({ Root: { opacity: 1 } }).when(
  ui.q.not(ui.q.any(ui.q.media('md'), ui.q.part('Root').state('hover'))),
  { Root: { opacity: 0 } },
)
```

In descriptor systems, later matching declarations within a precedence layer win
each resolved field. Legacy systems retain their historical pseudo/breakpoint
order within a layer; a higher override layer still wins over the whole lower layer.
A compound variant has no implicit specificity bonus. The curried `.variants<Mods>()(factory)` form also checks the complete
factory result; the old direct callback overload retains structural TypeScript
compatibility and cannot catch every excess property. Variant keys are canonical
literal strings at runtime and in TypeScript, including multi-value selections.
The matcher keeps a fast unsigned single-word path and uses multiple words beyond
32 allocated values. Equality uses exact rule membership and output operations,
not a lossy XOR hash. Caches are bounded and compiled plans are shared.

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
const web = createWebRenderer(ui, { manifest, tokens: {} })
const props = web.resolve(button, { variants: { size: 's', variant: 'accent' } })
// <button {...props.Root} /> works in an RSC/server entry: no hooks or refs.
```

`createNativeRenderer` evaluates the same declarations with explicit host facts
and rejects fields outside its documented finite native profile. Unsupported CSS
properties and values fail visibly instead of reaching a native host silently.
`createRenderer` accepts an output backend. `createTailwindBackend` in
`@toned/core/backends` takes exact field/value/utility mappings and optional fixed
parameter utilities. Its `source` is complete Tailwind v4 `@source inline()` input,
including dynamic parameter candidates. It rejects unmapped fields, conflicting
mapping definitions and CSS condition chains outside its initial runtime-facts
profile. Matching utility names alone does not establish scale equivalence.
A classes-only profile rejects dynamic channels. Browser condition support remains
a declared backend capability, not a promise that every backend supports every rule.

`ui.style(declaration)` is a pure immutable declaration helper. Human-authored
`t(...)` convenience remains compatible; agents should introduce named sheets and
bindings instead. The legacy `t` resolution getters depend on the installed
configuration; use the explicit renderer for server/request-isolated output.

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
one-based line placements. Construction checks rectangular regions, track counts,
and finite lengths. Hosts validate direct layout parentage and isolate repeated
grid instances. Multiple occupants intentionally overlap in source order. Grid
is enabled on web; native use throws a capability error. A web-scoped grid can
have an ordinary shared/native fallback. No measured JavaScript grid solver is
installed; native support awaits a verified integrated layout engine.

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
