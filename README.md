# Toned

Typed design tokens, named stylesheet parts, variants and conditions shared across
web and native host integrations. Declarations compile into immutable plans;
backends produce styles and mounted controllers own direct updates.

## Start here

Install `@toned/core` and `@toned/react`, then follow the
[React guide](packages/toned-react/README.md). Define a system and pure stylesheet,
create a stable component family with `createElements`, and build CSS before
rendering web applications. A family provider scopes variant inputs and shared
part ownership without adding a host element.

## Packages and status

| Package | Purpose |
| --- | --- |
| [`@toned/core`](packages/toned-core/README.md) | Typed authoring, matching, pure renderers, backends and deterministic CSS builds. |
| [`@toned/react`](packages/toned-react/README.md) | React 18/19 element families, prop bags, provider configuration and web/native host bindings. |
| [`@toned/systems`](packages/toned-systems/README.md) | Optional existing design vocabularies; the base vocabulary keeps legacy token names for compatibility. |
| [`@toned/themes`](packages/toned-themes/README.md) | Optional CSS theme values. |
| [`toned`](packages/toned/README.md) | Private workspace placeholder; no public umbrella API. Import the scoped packages above. |
| [`@toned/compiler`](packages/toned-compiler/README.md) | Private placeholder; source extraction is not implemented or required for explicit build inventories. |

## Contracts and verification

- [Implementation status](SPEC-COMPLETION.md) records supported contracts and
  architectural boundaries. Native grid and concrete RN/Fabric certification are
  not advertised as shipped capabilities.
- [Examples](examples/README.md) distinguish runnable integrations from historical
  host sketches; they are not a substitute for package conformance tests.
- [Benchmarks](benchmarks/README.md) report measured improvements and regressions.
- Embedded in HQ, use the root dependency installation and guarded
  `bun scripts/build/test-toned.ts` and `bun scripts/build/test-toned-react-versions.ts`
  runners. Do not install a second React tree in this submodule.

MIT; see [LICENSE](LICENSE).
