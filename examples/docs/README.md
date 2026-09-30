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
example has a checked context. Do not duplicate a displayed snippet in a
separate test or replace missing dependencies with untyped declarations.

The three native examples compile against the pinned, real React Native
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

Toned's build extracts classes from literal token values. A value computed from
a variable (for example `top: someConstant`) or a unitless string such as
`minWidth: '0'` produces no class, so put such values in `$style`. Inside
`$style`, use longhands (`borderColor`, `backgroundColor`) wherever a hover or
variant changes them: a shorthand beside its longhand drops the longhand.

The homepage uses a local web design system, explicit renderer and build
manifest. The style studio uses real component variants; the token map uses the
same accent vocabulary; the layout explorer uses a named 480px container
condition. Its connection animation respects reduced motion. `/playground` is a
free-form editor: write `styles.ts` and `App.tsx`, and the browser transpiles
them with TypeScript (loaded on demand; syntax only, not types), evaluates them
against a fixed module map, builds the exported sheets with `buildStyles` into a
scoped `<style>`, and renders through `createWebRenderer` — the same path a real
app takes, so hover, focus and container queries are real CSS. Only the
visitor's own draft runs; there are no code-carrying share links.
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
`/lab` contains seven real API experiments. Its source panels load the exact checked
implementation modules. The source inspector loads the compiler on demand and uses
one bounded in-memory document with revision-checked edits; it has no filesystem or
network write transport. Source is never evaluated.

The build prerenders every reference and every UI component page, and gives each
page a title and canonical URL. Code in references is highlighted at render time. The browser fixture verifies adaptive layout changes, reduced motion,
inline/PDF output, token diagnostics, real geometry contract pass/fail, inspector edit
round trips, search and mobile overflow. Package reference snippets are documentation;
the curated introductory snippets and actual lab modules receive compilation checks.

This site describes the development branch. Update the reference source revision
in `src/content/references.ts` and release guidance when publishing these APIs.
