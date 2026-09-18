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
| `expo-app` | Native integration sketch. A configured native host adapter and concrete renderer conformance are required; this directory alone does not establish them. |

The HQ checkout deliberately installs only its consumed Toned workspaces. The
optional docs/gallery dependencies are not present in that installation, so the
guarded core/React tests do not build these applications. Install example
dependencies through the monorepo's workspace manager in a standalone Toned
checkout when working on an example; do not create another React installation in
an embedded HQ submodule.

Production web styles come from `@toned/core/build` or `@toned/core/vite` with a
complete sheet inventory, including lazy routes. Runtime injection is a
`@toned/core/dev/inject` development helper, not a production delivery strategy.
