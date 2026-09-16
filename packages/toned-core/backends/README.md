# Output backends

Backends receive resolved field operations, their symbolic predicates and origins.
The common plan owns normalization, token evaluation, platform specialization and
source order. Backends lower those fields to their supported output vocabulary.

## CSS variables and atomic classes

SSR, mounted CSS hosts and direct `system.exec` calls all consume the same compiled
plan. The direct entry is a spelling adapter: it expands legacy flattened keys once
per input object/platform, then uses the common compiler and resolver. It has no
independent field resolver or cascade engine. Opaque grid/selector/class payloads
remain separate extension operations; accepting an extension is explicit. Tokens with
`pseudoRules` also retain a CSS effect operation, so a finite descendant or
pseudo-element class survives even when the token emits zero own fields. Native
and Tailwind reject these opaque CSS effects. Effects require generated finite
classes; browser-conditioned effect tokens need an explicit selector rule rather
than an unconditional atomic class.

The CSS lowerer preserves finite atomic classes and responsive classes for opted
legacy tokens. Contested fields and symbolic conditions use inline parameter
chains, with linear Boolean guards. Generated rule/predicate parameters unreachable
from the final fields are removed; authored custom properties and class-consumed
alpha parameters are preserved. Resolvers run once per selected occurrence;
static class selection uses the preserved authored token value rather than trying
to reconstruct it from resolved CSS fields. Per-part host updates use cached part,
extension and source indexes.

Explicit descriptors retain source-order field precedence. Unnamespaced legacy
systems have one deliberate compatibility policy: their historical media/state
ladder remains inside each override layer, and root ancestor/sibling source rules
retain their existing CSS channels. A legacy pseudo-only field with no resting
write retains its old missing fallback (computed-invalid when inactive), including
its effect on caller classes. Descriptor and advanced-query chains use
`revert-layer` for an absent resting field. Keeping that distinction avoids silently
changing existing application paint while moving the architecture to one plan.

HQ's `scripts/build/toned-css-plan-browser.ts` verifies computed values across three
viewport sizes, active/hover states, Boolean/container conditions, ancestor channels
and the legacy pseudo-only fallback. The Tailwind fixture independently compares
its compiled utility output with the descriptor CSS adapter.

## Tailwind build and runtime

```ts
// Build entry only. `compile` belongs to the application's installed Tailwind.
import { compile } from 'tailwindcss'
import { createTailwindBackend, createTailwindRuntime } from '@toned/core/backends'
import { buildTailwind } from '@toned/core/build'
const profile = createTailwindBackend({
  id: 'app-utilities',
  mappings: [
    { field: 'display', value: 'flex', utility: 'flex' },
    { field: 'gap', value: 12, utility: 'gap-[12px]' },
  ],
  parameters: [{
    field: 'gap', utility: 'gap-[var(--app-gap)]', variable: '--app-gap',
    serialize: value => `${value}px`,
  }],
})
const artifact = await buildTailwind(ui, profile, {
  sheets: [button, lazyDialog], tokens: daylight,
  source: '@tailwind utilities;', compile,
})
// Publish artifact.css and JSON.stringify(artifact.manifest).
// Runtime entry: import the JSON manifest and the shared system/profile definitions.
const backend = createTailwindRuntime(ui, profile, publishedManifest)
const renderer = createRenderer(ui, { backend, tokens: daylight })
```

For imports/plugins, pass a compiler closure that supplies Tailwind's normal
`loadStylesheet`/`loadModule` options. Application CSS source owns themes, prefix,
layers and external utilities. Toned does not silently choose a Tailwind scale or
configuration. The injected compiler is called only at build time; the returned
backend closes over the validated profile and declaration inventory, not compiler
functions. `createTailwindRuntime` accepts the JSON manifest, checks system/profile
identity and restores the bound adapter without emitting CSS or importing Tailwind.
Pure renderers and mounted hosts reject an unbuilt profile; `profile.resolve` is
only a low-level mapping/formatting helper. An unrelated CSS manifest does not
satisfy the gate, and an explicitly supplied renderer manifest must match the
bound backend's artifact.
Serializer implementations must be versioned with assets, like token resolvers;
function-source hashing cannot account for their captured dependencies. Do not
execute `buildTailwind` in a React render or server request.

The build passes complete candidates to Tailwind and uses isolated `@apply` probes
to check their actual declarations. A mapping must emit exactly one field and the
declared literal value (numeric dimensions mean CSS pixels); a parameter utility
must emit exactly its field with `var(--declared-channel)`. Conditional utilities,
shorthand utilities with additional declarations, `!important`, and expressions
whose equality cannot be established by this literal profile are rejected. A
different spelling can still be equivalent in a browser, but proving general CSS
expression equivalence requires environmental assumptions this portable profile
does not possess. Use exact arbitrary-value utilities or an explicit serializer
instead of asserting that a theme's rem spacing equals a fixed pixel value.

Every sheet, including lazy sheets, is explicit. Every authoring branch is evaluated
for mapping validation before runtime variants prune it. The base token set,
`ui.themes` and additional `themes: Tokens[]` are checked. Unrestricted values need
parameter channels; finite profiles cannot promise arbitrary future theme values.
Unknown sheets/conditions fail with a build-inventory diagnostic. The manifest
contains the system schema, candidates, declaration identities and CSS fingerprint;
`assertBuildArtifact` catches asset/manifest drift before publication.

## Conditional utility output

Local states and named/ad-hoc media/container conditions emit helper CSS ahead of
rendering. A true atom has a valid empty custom property; a false atom has an invalid
one. Complement channels implement NOT, products implement AND, and fallback
parameters implement OR without expanding the predicate tree into DNF. State gates
reset on every target, so an ancestor's state does not leak into a nested target.

Runtime resolution serializes each operation value once and builds the field's
fallback chain in the common plan's order. Exactly one fixed parameter utility
reads that chain. Overlapping predicates therefore retain Toned precedence even if
Tailwind sorts utility CSS differently. An unconditional winner can select one
finite utility directly. Theme/value changes update parameters; browser facts remain
browser-evaluated. Cross-part states and explicit relations require the mounted part
registry, because named parts alone establish no DOM ancestry; those facts update
the same controller without an additional React render.

| Capability | Built Tailwind profile |
| --- | --- |
| Exact finite field values | Validated complete utilities |
| Dynamic fields/theme values | Declared fixed parameter utility and serializer |
| Local state/media/container algebra | Precompiled helper gates and parameter utility |
| Overlapping rule precedence | Shared plan order, independent of class order |
| Cross-part/relation facts | Supplied by the mounted host registry |
| Classes-only browser conditions | Rejected: arbitrary overlap needs a conditional parameter channel |
| General utility/shorthand inference | Rejected: utility names do not establish field equivalence |
| Native host | Rejected: this output requires CSS utility classes |
| Arbitrary web selector/grid extension | Requires an adapter for that extension; no silent fallback |

Caller `className` ownership is preserved during patches and cleanup. That does not
promise an arbitrary caller utility wins a CSS conflict; applications own their CSS
cascade policy. A class attribute's order has no such meaning.

HQ's `scripts/build/toned-tailwind-browser.ts` is the release conformance fixture:
it uses actual Tailwind compilation, verifies prefix and rem/pixel mismatches,
compares first paint against CSS output with JavaScript disabled, and exercises
media, local state, container, boolean overlaps, dynamic values/themes and lazy
stylesheets without adding CSS rules. `toned-react/tailwind-built.test.tsx` checks
host-driven class updates, caller ownership and unchanged React render counts.
