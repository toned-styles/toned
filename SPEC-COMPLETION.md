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
| React lifecycle | Candidate/committed separation, layout-phase publication, direct host patches, ownership and baseline restoration, ref replacement/cleanup, Suspense isolation, and real React 18/19 compatibility. |
| Element families | `createElements(sheet)` creates stable module-level part components and a hostless provider carrying typed variant inputs. Independent standalone parts use base/default declarations; scoped parts share the nearest matching family's render snapshot and controller. Dependent standalone relationship/grid parts report a named missing-scope error. Existing binding APIs remain compatible. |
| External measurements | Stable container-size stores publish host-local facts directly without styling renders, including repeated and nested containers within one element family. Native viewport facts come from an explicit host capability instead of a browser-global fallback. |
| Configuration | Pure renderers and `TonedProvider` separate output, tokens, and host integration. Theme changes preserve bound component identity. Legacy configuration remains a migration adapter. |
| Web delivery | Deterministic assets/manifests, complete explicit/lazy inputs, namespaces, Vite dependency/HMR support, package smoke checks, and browser checks with JavaScript disabled. Rendering and updates do not inject stylesheets. |
| Tailwind | Actual compiler validation, exact finite/parameter mappings, complete candidate and declaration inventories, JSON manifest runtime reconstruction, Boolean helper CSS, source-order field winners, SSR output, and direct owned class/parameter updates. |
| Native | Explicit versioned host adapter contract, declared reset, semantic state, topology and viewport capabilities, patch/baseline/cleanup conformance fixtures, and rejection of unsupported CSS-only output. Concrete renderer certification is separately identified below. |
| Web extensions | Typed anchored `webRules` with an explicit build inventory, and typed grid definitions/areas and complete responsive layout variants with stable family ownership, CSS-only container/media resizing, and web ownership checks. |
| Validation and performance | Guarded tests/types/packed consumer, actual React version matrix, actual browser backend parity, HQ consumer/showcase checks, and comparative cold compilation, construction, mount/update, per-child overrides, SSR/CSS/declaration size, typecheck and retention measurements with structural CI assertions. Performance findings are reported individually, including regressions. |

## Explicit decisions and capability boundaries

- **Existing `useBind` redesign:** remains deferred. The later API discussion
  selected and authorized `createElements(sheet)`, implemented as described
  above and in [the React package](packages/toned-react/README.md#element-families).
  Its provider is optional for independent base/default parts and required to
  share variant inputs or cross-part ownership. Existing `useBind`, `bind`, and
  `$scope` retain their public model. No custom JSX runtime or compiler is needed.
- **Native vertical writing modes:** the portable logical-layout contract defaults
  to horizontal LTR and supports an explicit immutable direction/writing mode.
  Native rejects vertical logical layout because the shipped host contract has
  no vertical text/layout engine. CSS lowering supports the declared modes.
- **Native grid:** unavailable. Context can assign named areas but cannot supply
  grid's intrinsic track sizing, span resolution, baseline alignment, and layout
  integration. This repository has no integrated native grid layout host.
  Web grid is enabled independently; native requires a real layout
  engine and host conformance before the same capability can be advertised.
- **Concrete RN/Fabric acceptance:** the pinned Android profile now passes real
  native acceptance: RN 0.86.0, React 19.2.3, Fabric/Hermes, Android API 36 arm64.
  Six automatic scenarios and a real press/release gesture verify 49 assertions
  across native layout, focus, text/placeholder paint, caller baselines, resets,
  host ownership, refs and Suspense. This does not certify iOS, other versions,
  native topology/recycling or every native drawing frame. See
  [NATIVE-HOSTS.md](packages/toned-react/NATIVE-HOSTS.md) for exact evidence and
  capability boundaries. Unit fixtures are not substituted for device results.
- **Other styling engines:** typed custom primitives and host resolvers are
  available composition boundaries. Opaque foreign styles must travel through
  separate props and retain their engine's binding lifecycle. Unistyles is explicitly out of scope for this follow-up. Its engine
  backend and overlapping imperative ownership are not implemented or certified;
  they need explicit compilation, writer and CSS-delivery contracts. See
  [INTEGRATIONS.md](packages/toned-react/INTEGRATIONS.md) for public integration
  routes, ownership limits and native acceptance requirements.
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
- **Changing a host's override hook while mounted:** equivalent host objects keep
  provider and bound-part identities stable. Replacing `useStyleOverrideScope`
  itself requires an explicit provider key/remount. The hook must run at each
  consumer so it sees nested override contexts; moving it to the provider changes
  scope semantics, while swapping arbitrary hook implementations in that consumer
  violates React's fixed hook order. Providers diagnose the change explicitly.

## Evidence

Run from the HQ workspace root (one dependency installation):

```sh
bun scripts/build/test-toned.ts
bun scripts/build/test-toned-react-versions.ts
bun scripts/build/test-toned-docs.ts
bun scripts/build/test-toned-docs.ts
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

The September 18 cleanup removes the monorepo's error-level Biome backlog,
including example formatting/imports and concrete accessibility/equality defects.
HQ's validation scripts are checked with its own oxlint rules. The stricter
`ci:lint` command includes `--error-on-warnings` and is still not green: its
remaining warnings primarily concern non-null assertions, explicit `any` and
banned type forms, plus generated routes and deliberate example CSS/cookie usage.
An error-only pass is not presented as a passing strict CI gate; no new exclusions
or blanket rule suppressions hide that distinction.

The maintained docs/gallery now belong to HQ's pnpm workspace and resolve the
same physical React installation as the runtime. The guarded docs runner checks
both projects with HQ's TypeScript compiler, builds client and server bundles,
prerenders 14 routes, and verifies hydration, syntax highlighting, lazy gallery
loading and generated button dimensions in Chromium against an owned server.
The metadata generator uses a separate TypeScript 5 compiler API and shares one
program across components; application typechecking still uses HQ's compiler.
Only the three used syntax grammars are loaded, on demand. The browser check
also caught and now covers a base-system bug that treated literal dimensions
such as `2.25rem` as missing named spacing tokens. Native backends still reject
CSS-only dimensions; percentages and named spacing aliases retain their behavior.

The expanded React Doctor scan (library plus changed examples) reports zero
errors and six warnings, scoring 70/100. The example carousel now releases both
of its subscriptions. Remaining warnings concern the intentional stable `useBind`
family memo, the React-18-compatible ref cleanup fixture, and four gallery concerns:
constructed carousel context values, eagerly imported chart code, a chart memo
before an early return, and error-list index keys. The docs application alone
scores 100/100. These results are distinct from the earlier library-only scan.
Adding a render candidate to `useBind`'s memo dependencies would recreate component
types and violate its identity contract. The cleanup fixture goes through Toned's
ref composer, and both actual React versions verify balanced cleanup. No new
configuration suppression conceals these diagnostics.


### Follow-up consolidation and external styles

The matcher now indexes large plans by necessary positive facts while preserving
complete predicate checks, source order and exact membership. Controller metadata
is immutable and shared; mounted-family resources are lazy and reused by render
candidates. [Measurements](benchmarks/README.md#september-18-follow-up-against-the-previously-delivered-version)
record both the targeted gains and the remaining cold/mount costs.

The empty `toned` umbrella is explicitly private, and the optional compiler stub
is documented as unimplemented; supported consumers import scoped packages.
Theme CSS has an explicit export and is copied into built packages, with the
actual built CSS/module resolved by HQ's guarded consumer smoke test.

External style handles travel through a typed custom component prop and remain
opaque to Toned. Generic DOM/native-fixture tests cover this composition boundary;
they do not certify Unistyles. The separate Android acceptance app verifies the
pinned Fabric profile described above. A full external engine integration needs
one authoritative writer and its own compilation/dependency and CSS-delivery
contract. See [the integration guide](packages/toned-react/INTEGRATIONS.md).
