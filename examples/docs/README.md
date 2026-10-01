# Toned documentation

The rendered `CodeBlock` strings are the source of truth for code examples. In
HQ, `bun scripts/build/test-toned-docs.ts` extracts every block, checks the web
and portable TypeScript examples, builds client/SSR bundles, and exercises
prerendering and hydration in a test-owned browser.

The extractor lives in
`scripts/build/__tests__/fixtures/toned-doc-examples.ts`. It supplies bounded
application context for incomplete fragments, reuses the actual getting-started
example for shared modules, and classifies CSS and installation commands
separately. Adding a route or code block fails its inventory until the new
example has a checked context.

Examples keep three layers apart, each in its own titled block (`title` is the
file name): `styles.ts` for the stylesheet, a component file such as
`Button.tsx`, and `system.ts` for `defineSystem` plus
`export const { stylesheet } = ui`; build and renderer setup go in
`vite.config.ts` and `App.tsx`. A page leads with the layer it teaches and shows
the system once, later on the page, or links to Getting Started. The
extractor's `modules` table writes those blocks under the same file names, so
the other examples on the page import them as shown. Do not duplicate a displayed snippet in a
separate test or replace missing dependencies with untyped declarations.

The four native examples compile against the pinned, real React Native
dependencies in `bun scripts/build/test-toned-fabric.ts --phase prepare`. The
web docs job reports this separate coverage and does not claim native
certification. Application-owned host identity functions have explicit typed
scaffolding; React Native itself is never mocked for this check.

Compilation checks the examples; Fabric device acceptance remains the gate
for actual mounted native behavior. The native TypeScript 7 process used by
HQ is outside JavaScript I/O guards, while guarded child runners still prove
their JavaScript guard installation.


## Site structure

Every page shares one header (`SiteHeader`), footer and palette
(`src/styles/brand.ts`); the shell stylesheets live in `src/styles/site.ts`.
Documentation pages render inside one layout (`src/routes/__root.tsx`): the
sidebar, breadcrumb and previous/next links all come from `src/content/nav.ts`,
so adding a page there places it everywhere. The "On this page" rail only
reads headings that already carry an `id` — give new `h2`/`h3` headings one in
render; mutating the article during hydration would cause a mismatch.

`CodeBlock` highlights synchronously with Shiki's core and a brand theme
(`src/highlight.ts`), so prerendered HTML ships already coloured and hydrates
without a mismatch. Pass `lang` (Markdown fence labels such as `ts`, `sh`,
`json` work) or let it infer one; `bare` drops the frame inside a panel.

Design values live in the docs system as typed tokens (`src/styles/tokens.ts`,
spread into `docsSystem`): sheets reference roles such as `text: 'muted'`,
`fill: 'surface'` and `radius: 'xl'`. `$style` is an escape hatch for the few
properties no token covers, each with a comment saying why. Where `$style` is
used, prefer longhands (`borderColor`, `backgroundColor`) when a hover or
variant changes them: a shorthand beside its longhand drops the longhand. A
unitless string such as `minWidth: '0'` is read as a spacing alias; use the
number `0`.

The homepage uses a local web design system, explicit renderer and build
manifest. The style studio uses real component variants; the token map uses the
same accent vocabulary; the layout explorer uses a named 480px container
condition. Its connection animation respects reduced motion. `/playground` is a
free-form editor with one file per layer: `styles.ts` (style declarations),
`App.tsx` (the component) and `system.ts` (the design system the sheets import
`stylesheet` from). The browser transpiles
them with TypeScript (loaded on demand), evaluates them
against a fixed module map, builds the exported sheets with `buildStyles` into a
scoped `<style>`, and renders through `createWebRenderer` — the same path a real
app takes, so hover, focus and container queries are real CSS. Only the
visitor's own draft runs; there are no code-carrying share links.

The playground editor is CodeMirror 6 (`playground-editor/codemirror.ts`),
created in an effect over the same static Shiki-highlighted code the server
renders, with the same metrics and colours (`codeColors` in `src/highlight.ts`),
so nothing moves when it mounts. A Web Worker
(`playground-editor/language/ts.worker.ts`) runs two services over the three
files. TypeScript's language service checks them against an in-memory project:
the ES2022 + DOM libs, React's types and the Toned packages' own source, loaded
as text in lazy chunks (`types-lib`, `types-react`, `types-toned`) that only
`/playground` fetches. It is the authority on types, and supplies diagnostics,
completions and hover types. Toned's `DesignLanguageService`
(`@toned/compiler/language-service`) indexes the same files plus the base
system's source. It adds what the type checker does not have as data: a
stylesheet's type is inferred from its own literal, so TypeScript offers no
names where a declaration is being written, and Toned supplies the token names
there; it also supplies a token's values before any quote is typed and for
numeric scales, ranks a sheet's variant axes first after `$.`, and shows each
declaration's design path, token, allowed values and defining file on hover.
It has no token documentation and no resolved CSS values, and its
`token-value` warning usually repeats a TypeScript error rather than finding a new one.
Type errors never block the preview. The worker answers one request per task,
so a newer request of the same kind replaces a queued one; a running
TypeScript call cannot be interrupted. `vite.config.ts` sets
`worker.format: 'es'` because only that format can split the worker's chunks.
Getting Started lives at `/getting-started`, and `/ui` hosts the component
gallery.

Brand assets live in `public/brand`: the folded-T symbol and outlined wordmark
are SVGs, with no external font or image request. The homepage and playground
are prerendered alongside the guides. The HQ docs runner checks README snippets,
variant state preservation, resets, container switching, mobile overflow,
reduced motion, guide navigation, syntax highlighting, and the gallery.


`/explore` indexes 22 source-backed references, loaded from the package Markdown
rather than copied into routes. `/learn/$topic` renders them with semantic React
markup; relative reference links map to the local directory and remaining source
links point to the documented branch. Raw HTML is displayed as text, never injected.
`/lab` contains seven real API experiments. Each experiment is split into the
modules a project would have — `*.styles.ts` (declarations), the component, and a
system or configuration module — and its source panel shows those files as they
run (`?raw`), one tab per layer, styles first. Where the declaration is the
subject (email/PDF output, measured contracts) it is shown above the demo and the
configuration below it. The source inspector loads the compiler on demand and uses
one bounded in-memory document with revision-checked edits; it has no filesystem or
network write transport. Source is never evaluated.

The build prerenders every reference and every UI component page, and gives each
page a title and canonical URL. Code in references is highlighted at render time. The browser fixture verifies adaptive layout changes, reduced motion,
inline/PDF output, token diagnostics, real geometry contract pass/fail, inspector edit
round trips, search and mobile overflow. Package reference snippets are documentation;
the curated introductory snippets and actual lab modules receive compilation checks.

This site describes the development branch. Update the reference source revision
in `src/content/references.ts` and release guidance when publishing these APIs.

## Theme showcase

`/themes` renders one interface in six themes. It has its own system so that
the site's look does not change with the demo.

- `src/styles/themes/theme.ts` is the theme schema; `themes.ts` holds the six
  themes; `tokens.ts` defines the tokens with `defineTokenFor<Theme>()`;
  `system.ts` declares the system with those themes.
- `src/styles/themes/sheets/` holds the stylesheets. None of them names a theme.
- `src/styles/themes/vite.ts` builds that system's CSS with `buildStyles`,
  which writes the declared themes as custom properties. It serves the CSS as
  `virtual:toned-themes.css`, with the manifest as
  `virtual:toned-themes.manifest`. `@toned/core/vite` serves a single system,
  which the site already uses.
- `src/components/themes/` holds the components. `ReleaseApp` sets
  `data-theme` on its root, and that attribute is the only thing that changes
  when the theme is switched.

To add a theme, add an object to `themes` and an entry to `themeList`. The
type checker lists any field that is missing.

