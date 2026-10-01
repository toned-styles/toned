# Toned documentation

The site at [toned.style](https://toned.style) is built from this directory.
Run it from the repository root after installing the workspace dependencies:

```sh
pnpm install
pnpm --filter @examples/docs dev        # development server
pnpm --filter @examples/docs build      # client and SSR bundles, then prerendering
pnpm --filter @examples/docs typecheck
```

The rendered `CodeBlock` strings are the source of truth for code examples.
Write each block so that it compiles in the context the page establishes; do not
duplicate a displayed snippet in a separate test or replace missing
dependencies with untyped declarations.

Examples keep three layers apart, each in its own titled block (`title` is the
file name): `styles.ts` for the stylesheet, a component file such as
`Button.tsx`, and `system.ts` for `defineSystem` plus
`export const { stylesheet } = ui`; build and renderer setup go in
`vite.config.ts` and `App.tsx`. A page leads with the layer it teaches and shows
the system once, later on the page, or links to Getting Started. Other examples
on the page import those blocks by the same file names.

Native examples are written against real React Native types. Compiling them does
not certify native behavior; the [Fabric acceptance app](../fabric-acceptance/README.md)
is the gate for mounted native behavior.

## Site structure

Every page shares one header (`SiteHeader`), footer and palette
(`src/styles/brand.ts`); the shell stylesheets live in `src/styles/site.ts`.
Documentation pages render inside one layout (`src/routes/__root.tsx`): the
sidebar, breadcrumb and previous/next links all come from `src/content/nav.ts`,
so adding a page there places it everywhere; add its path to `routes` in
`prerender.js` as well. The header has four destinations (Docs, Components,
Themes, Playground); everything in the documentation layout belongs to Docs.

The "On this page" rail only reads headings that already carry an `id` — give
new `h2`/`h3` headings one in render; mutating the article during hydration
would cause a mismatch. It watches the article with a mutation observer rather
than the URL: the router changes the location before the next page is on
screen, and a reference page renders after its Markdown has loaded.

Scrolling on navigation is the router's (`scrollRestoration: true` in
`src/main.tsx` and `src/entry-server.tsx`): a new page starts at the top, back
and forward restore the position, and a hash scrolls to its heading, which
clears the sticky header through the `anchor` token. The sidebar is a named
scroll region (`data-scroll-restoration-id`) and keeps its position; it scrolls
only to bring the current page's link into view. After a navigation the layout
moves focus to `#docs-main`. Link to other pages with the router's `Link`, not
`<a href>`, so a navigation does not reload the document; Markdown links are
handled by `ReferenceMarkdown`.

Installation commands use `InstallCommand`, which shows the npm, pnpm, yarn and
bun forms.

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

The homepage (`src/routes/index.tsx`, `src/components/home/`) embeds the theme
showcase and follows one small component, `Notice`, through three real modules
in `src/components/home/story/` (system, styles, component). The code shown is
imported with `?raw`, so it is the code that runs; that example has its own
system, built by the `homeStory()` plugin. The supported-systems line lists
only what exists and stops moving under reduced motion. `/playground` is a
free-form editor with one file per layer: `styles.ts` (style declarations),
`App.tsx` (the component) and `system.ts` (the design system the sheets import
`stylesheet` from). The browser transpiles
them with TypeScript (loaded on demand), evaluates them
against a fixed module map, builds the exported sheets with `buildStyles` into a
scoped `<style>`, and renders through `createWebRenderer` — the same path a real
app takes, so hover, focus and container queries are real CSS. Only the
visitor's own draft runs; there are no code-carrying share links.

The playground editor is CodeMirror 6
(`src/components/playground-editor/codemirror.ts`),
created in an effect over the same static Shiki-highlighted code the server
renders, with the same metrics and colours (`codeColors` in `src/highlight.ts`),
so nothing moves when it mounts. A Web Worker
(`src/components/playground-editor/language/ts.worker.ts`) runs two services over the three
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
are prerendered alongside the guides.

`/explore` indexes 22 source-backed references, loaded from the package Markdown
rather than copied into routes. `/learn/$topic` renders them with semantic React
markup; relative reference links map to the local directory, links to
`https://toned.style` stay inside the site, and remaining source links point to
`main` (`sourceRef` in `src/content/references.ts`). Raw HTML is displayed as
text, never injected.

`/changelog` is generated from each package's `CHANGELOG.md`
(`src/content/changelog.ts`); nothing about a release is written in the site.
A section headed `# Next release`, or a version heading without a date, is
listed as the next release. Conventional-commit headings map onto Added,
Changed and Fixed. To record a change, edit the package's `CHANGELOG.md`.

`/examples` contains seven interactive examples (`src/components/lab`); `/lab`
forwards there and keeps the hash. Each example is split into the
modules a project would have — `*.styles.ts` (declarations), the component, and a
system or configuration module — and its source panel shows those files as they
run (`?raw`), one tab per layer, styles first. Where the declaration is the
subject (email/PDF output, measured contracts) it is shown above the demo and the
configuration below it. The source inspector loads the compiler on demand and uses
one bounded in-memory document with revision-checked edits; it has no filesystem or
network write transport. Source is never evaluated.

The build prerenders every reference and every UI component page, and gives each
page a title and canonical URL. Code in references is highlighted at render
time.

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
