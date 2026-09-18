# `@toned/compiler` workspace placeholder

This package is private and has no compiler implementation or public entry point.
It does not scan source files, extract token usage, or generate stylesheet code.
Source extraction remains an optional future integration; applications do not
need it to build or render Toned styles.

The working build APIs are:

- `buildStyles(system, { sheets })` from `@toned/core/build` for deterministic CSS
  and its validation manifest.
- `@toned/core/vite` for the virtual stylesheet and build/watch integration.
- `createWebRenderer` from `@toned/core/server` for pure resolution against a
  build manifest.

Supply a complete sheet inventory, including declarations used by lazy routes,
rather than depending on this placeholder to discover imports. See
[the core package](../toned-core/README.md) for the implemented delivery contract.
