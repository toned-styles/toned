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


The homepage (`/`) and `/playground` share a local web design system, explicit
renderer, and build manifest. The style studio uses real component variants;
the token map uses the same accent vocabulary; the layout explorer uses a named
480px container condition. Its connection animation respects reduced motion.
Getting Started lives at `/getting-started`, while `/ui` retains the component
gallery. The playground source panels import the authored modules as text, so
shown source and running declarations stay together. This is a visual variant
playground, not an arbitrary code execution sandbox.

Brand assets live in `public/brand`: the folded-T symbol and outlined wordmark
are SVGs, with no external font or image request. The homepage and playground
are prerendered alongside the guides. The HQ docs runner checks README snippets,
variant state preservation, resets, container switching, mobile overflow,
reduced motion, guide navigation, syntax highlighting, and the gallery.
