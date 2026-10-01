# Examples

The package READMEs describe the supported API. This directory also contains
integration sketches and a component gallery; a source example is not a
certification of its renderer.

| Directory           | Status                                                                                                                                                                                                                                                                                                                        |
| ------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `docs`              | Maintained Vite website, playground, interactive examples and source-backed reference directory. Homepage and example demos use explicit renderers and sheet inventories; the component collection uses the `@toned/systems/base` vocabulary.                                                                                    |
| `ui`                | Shared gallery components, consumed by `docs`; not a standalone application. Uses the base vocabulary's token spellings.                                                                                                                                                                                                    |
| `shared`            | Stylesheet examples shared by the email/PDF/native sketches.                                                                                                                                                                                                                                                                  |
| `email`, `pdf`      | Explicit `createInlineRenderer` and `createPdfRenderer` integration examples with concrete tokens. Their supported renderer profiles are documented in core; final email-client compatibility and document layout still require application testing. The website's interactive examples show actual resolved output for both. |
| `fabric-acceptance` | Pinned offline Android Fabric app, with native measurements/paint readback and real touch acceptance. Installed in an isolated temporary consumer; see its README.                                                                                                                                                            |
| `vite`              | Minimal SSR sketch using global configuration and the `@toned/core/dom` development injector. It does not demonstrate production CSS delivery.                                                                                                                                                                                 |
| `expo-app`          | Native integration sketch. A configured native host adapter and concrete renderer conformance are required; this directory alone does not establish them.                                                                                                                                                                     |

All examples are workspace packages. From the repository root, run
`pnpm install` once, then start the documentation site with
`pnpm --filter @examples/docs dev`. Do not install dependencies separately inside
an example directory; `fabric-acceptance` is the exception and documents its own
isolated installation.

Production web styles come from `@toned/core/build` or `@toned/core/vite` with a
complete sheet inventory, including lazy routes. Runtime injection is a
`@toned/core/dev/inject` development helper, not a production delivery strategy.
