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
| [`@toned/compiler`](packages/toned-compiler/README.md) | Optional source graph, scoped edits, language server, inspector, measured contracts and DTCG interchange. |

## Design tooling and portable capabilities

Use the [design tools](packages/toned-compiler/README.md) for source-aware
completion/navigation, revision-bound edits and measured design contracts.
The same source model serves an LSP client, an agent or the browser inspector;
application modules are never executed to inspect declarations.

[Adaptive layouts](packages/toned-core/adaptive/README.md) select typed flex
alternatives through existing variants using explicit container/content/text-scale
inputs. [Motion](packages/toned-core/motion/README.md) adds timing/spring
transitions, interruption and reduced motion through the existing host writer.
Both capabilities are opt-in subpath imports, preserving the ordinary runtime.

## Contracts and verification

- [Implementation status](SPEC-COMPLETION.md) records supported contracts and
  architectural boundaries. A pinned [Android Fabric profile](packages/toned-react/NATIVE-HOSTS.md)
  has real native acceptance evidence; native grid remains unsupported.
- [Examples](examples/README.md) distinguish runnable integrations from historical
  host sketches; they are not a substitute for package conformance tests.
- [Benchmarks](benchmarks/README.md) report measured improvements and regressions.
- Embedded in HQ, use the root dependency installation and guarded
  `bun scripts/build/test-toned.ts` and `bun scripts/build/test-toned-react-versions.ts`
  runners. `bun scripts/build/test-toned-docs.ts` checks the documentation and
  gallery production build and browser hydration; see the examples guide for
  browser installation. Do not install a second React tree in this submodule.

MIT; see [LICENSE](LICENSE).
