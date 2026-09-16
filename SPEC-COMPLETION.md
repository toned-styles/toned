# Consolidation specification: implementation status

This records the result against HQ's reviewed
`docs/research/2026-09-10-toned-checkpoint-review.md`. The original review is a
point-in-time design document and has not been rewritten to match the code.

## Implemented contracts

| Area | Result and implementation |
| --- | --- |
| Typed authoring | Descriptor systems, immutable token/config data, typed theme resolver inputs/outputs with schema-bound references, structured lengths/colors/theme references, explicit logical-layout mapping, `$kind`, portable `$style`, platform widening, recursive query validation, human aliases, chained and curried variants. Explicit/default descriptor kinds retain restrictions; legacy untyped web parts retain their compatibility escape. |
| Defaults and explicit inputs | Defaulted axes may be omitted; explicit undefined chooses the default. `useStyles(sheet, { variants, overrides })` separates styling overrides from host props. Pure authoritative composition is available for server/build inputs. |
| Conditions | Boolean queries, colocated media/container/state rules, cross-part state facts, and `q.part(source).has(target, state, { scope })`. Relations use registered-part child/descendant semantics within one mounted stylesheet family. Portals require explicit logical topology. |
| Portable evaluation | Immutable semantic plans, ordered field operations, shared token evaluation, explicit backend capabilities, declaration provenance, explanations including emitted props, finite subset-shadow diagnostics, and checked resolver footprints. CSS lowering is separated from system definitions. |
| Precedence and overrides | Descriptor source order, exact multiword bitsets, exact matched-rule membership, authoritative layers, structural null deletion, and a bounded cache of sibling override sequences. Legacy specialization order remains a deliberate compatibility mode. |
| React lifecycle | Candidate/committed separation, layout-phase publication, direct host patches, ownership and baseline restoration, ref replacement/cleanup, Suspense isolation, and real React 18/19 compatibility. Existing bound-part internals received compatibility fixes; their public redesign is excluded below. |
| External measurements | Stable container-size stores publish facts directly without styling renders. Native viewport facts come from an explicit host capability instead of a browser-global fallback. |
| Configuration | Pure renderers and `TonedProvider` separate output, tokens, and host integration. Theme changes preserve bound component identity. Legacy configuration remains a migration adapter. |
| Web delivery | Deterministic assets/manifests, complete explicit/lazy inputs, namespaces, Vite dependency/HMR support, package smoke checks, and browser checks with JavaScript disabled. Rendering and updates do not inject stylesheets. |
| Tailwind | Actual compiler validation, exact finite/parameter mappings, complete candidate and declaration inventories, JSON manifest runtime reconstruction, Boolean helper CSS, source-order field winners, SSR output, and direct owned class/parameter updates. |
| Native | Explicit versioned host adapter contract, declared reset, semantic state, topology and viewport capabilities, patch/baseline/cleanup conformance fixtures, and rejection of unsupported CSS-only output. Concrete renderer certification is separately identified below. |
| Web extensions | Typed anchored `webRules` with an explicit build inventory, and typed grid definitions/areas and complete responsive layout variants with stable family ownership, CSS-only container/media resizing, and web ownership checks. |
| Validation and performance | Guarded tests/types/packed consumer, actual React version matrix, actual browser backend parity, HQ consumer/showcase checks, and comparative cold compilation, construction, mount/update, per-child overrides, SSR/CSS/declaration size, typecheck and retention measurements with structural CI assertions. Performance findings are reported individually, including regressions. |

## Explicit exclusions and architectural boundaries

- **`useBind` / `createElements` redesign:** deferred by Artur's instruction. There
  is no new `createElements` export. Existing `useBind`, `bind`, and `$scope`
  retain their public model. Correctness fixes such as React 18 ref forwarding
  are included; they do not settle the later API discussion.
- **Native vertical writing modes:** the portable logical-layout contract defaults
  to horizontal LTR and supports an explicit immutable direction/writing mode.
  Native rejects vertical logical layout because the shipped host contract has
  no vertical text/layout engine. CSS lowering supports the declared modes.
- **Native grid:** unavailable. Context can assign named areas but cannot supply
  grid's intrinsic track sizing, span resolution, baseline alignment, and layout
  integration. This repository has no integrated native grid layout host.
  Web grid is enabled independently; native requires a real layout
  engine and host conformance before the same capability can be advertised.
- **Certification of a concrete RN/Fabric renderer:** not claimed. This library
  owns no React Native app, concrete primitive implementation, renderer version,
  or native build target. A structural `setNativeProps` check cannot establish
  commit/reset behavior. Applications must declare their host adapter and pass
  the scenarios in [NATIVE-HOSTS.md](packages/toned-react/NATIVE-HOSTS.md). Unit/contract fixtures do
  not substitute for that integration evidence.
- **Arbitrary selectors:** `webRules` is a CSS extension, not portable condition
  algebra. Use anchored selectors within it for pseudo-elements, exact DOM
  children, and arbitrary `:has()` expressions. Portable conditions around an
  opaque selector block are diagnosed; use registered-part relations for shared
  semantics. Native/Tailwind portable profiles reject unsupported CSS extensions.
- **Classes-only Tailwind:** arbitrary dynamic values and overlapping browser
  predicates cannot in general be represented by a finite class list with
  Toned's ordering. Fixed, precompiled parameter utilities support those cases;
  a strict classes-only profile rejects them. Unprovable CSS expression/unit
  equivalence is rejected rather than inferred from utility names.
- **Source extraction:** optional in the reviewed design, and remains optional.
  Explicit sheet inventories and generators already establish build delivery.
  Runtime declaration objects have no trustworthy source locations; a compiler
  must obtain them from source maps/ASTs, rather than a runtime stack heuristic.
  The compiler stub is not advertised as a working extractor.
- **Compatibility surfaces:** global configuration, old declaration aliases,
  flat hook arguments, and legacy cascade order remain for existing consumers.
  New renderer/provider APIs avoid those switches. HQ keeps its existing
  Daylight namespace and cascade while migrating authoring; changing the
  namespace/default primitive or cascade is a separate visible product change.

## Evidence

Run from the HQ workspace root (one dependency installation):

```sh
bun scripts/build/test-toned.ts
bun scripts/build/test-toned-react-versions.ts
bun scripts/build/toned-browser.ts
bun scripts/build/toned-css-plan-browser.ts
bun scripts/build/toned-tailwind-browser.ts
node vendor/toned/benchmarks/completion.mjs --current-only
```

See [benchmarks/README.md](benchmarks/README.md) for comparative measurements and
limits, [core/README.md](packages/toned-core/core/README.md) for plan/explanation
semantics, and [backends/README.md](packages/toned-core/backends/README.md) for the
verified Tailwind delivery contract. HQ's PR records consumer checks and the
showcase result at the delivered submodule pin.

### Static analysis scope

The changed Toned files are checked with Biome at error severity; HQ's new
validation scripts are checked with its own oxlint rules. The monorepo-wide
`ci:lint` command also covers historical examples/configuration outside this
change and is not green: the preceding `07cd173` checkout produces 472 errors
with the same error-only command. This is not presented as a passing release
gate or hidden by a new exclusion list.

React Doctor reports no errors and four warnings. The `useBind` memo intentionally
seeds a stable component family once per stylesheet/config; later candidates
publish in a layout effect. Adding the candidate to that memo's dependencies
would recreate component types on every render and violate the identity contract.
The other three warnings concern exporting library helpers beside the override
provider, which limits Fast Refresh granularity for library development. Neither
warning is suppressed by a new configuration change.
