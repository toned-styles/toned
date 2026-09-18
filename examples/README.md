# Examples

The package READMEs describe the current supported API. This directory also
contains older integration sketches and a component gallery; a source example
is not a certification of its renderer.

| Directory | Status |
| --- | --- |
| `docs` | Vite documentation/gallery application. It uses the compatibility base system and global config; current getting-started snippets use explicit sheet inventories and `createElements`. |
| `ui` | Shared gallery components, consumed by `docs`; not a standalone application. Legacy token spellings remain to match the base system. |
| `shared` | Historical stylesheet examples shared by the email/PDF/native sketches. |
| `email`, `pdf` | Renderer sketches; their custom rendering/host constraints require integration work before they can be treated as supported production targets. |
| `fabric-acceptance` | Pinned offline Android Fabric app, with native measurements/paint readback and real touch acceptance. Installed in an isolated temporary consumer; see its README. |
| `expo-app` | Native integration sketch. A configured native host adapter and concrete renderer conformance are required; this directory alone does not establish them. |

The HQ workspace includes `docs` and `ui` with the same React installation as
the runtime packages. From the HQ root, run `pnpm install --frozen-lockfile`,
install the browser fixture with `pnpm --filter @scripts exec playwright install chromium`,
then run `bun scripts/build/test-toned-docs.ts`. The guarded runner checks both projects'
types, builds the documentation's client and server bundles, and prerenders its
routes (including the gallery) in a temporary directory. Chromium checks
hydration, syntax highlighting, lazy gallery loading and the rendered button's
generated styles against a process-owned server. It verifies that both examples
resolve the runtime's React instance. The documentation metadata tool
uses its own TypeScript 5 compiler API; application typechecks use HQ's compiler.

For interactive development, run `pnpm --filter @examples/docs dev` from the HQ
root. Do not install dependencies separately inside the embedded submodule.

Production web styles come from `@toned/core/build` or `@toned/core/vite` with a
complete sheet inventory, including lazy routes. Runtime injection is a
`@toned/core/dev/inject` development helper, not a production delivery strategy.
