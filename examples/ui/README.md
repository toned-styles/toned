# Toned UI example

A collection of composable React components styled with Toned. Explore the
[interactive showcase](https://toned.style/ui), or open a component page to see
its actual stylesheet, variants and implementation.

The collection is an example application, not a separately published component
package. Components combine Toned styles with existing accessible primitives
from Radix UI and Base UI. Check each component's imports when adapting it.

## Explore the collection

The website's Orbit workspace composes cards, tabs, buttons, checkboxes, inputs,
progress bars and switches into a working product example. Complete milestones,
add local demo teammates, change notification preferences, or adjust card density
and button shapes. Demo state is local and resets on reload.

Each component page includes prop controls and source extracted from its TSX
module at build time. Stylesheets are exported so consumers can apply scoped
`StyleOverrides` without modifying the component. The live editor accepts a
bounded JSON subset: named parts, surface/text colors, corner radii, shadows,
spacing and opacity. Invalid edits retain the last valid preview. Reset restores
the original styles without remounting the component. The editor does not execute
TypeScript, write files, persist changes, or edit variant selectors; the full
stylesheet remains available to inspect and copy.

## Composition details

- **Card:** `density="comfortable" | "compact"` coordinates spacing across its
  header, content and footer. `appearance="elevated" | "outline" | "soft"` selects
  the surface. Nested cards establish independent density contexts.
- **Progress:** `value`, `max` and `size="sm" | "md" | "lg"` control the fill and
  track. Values are clamped to the valid range. Missing or non-finite values are
  indeterminate. The Radix root receives the same value and maximum used by the
  visual indicator. Reduced-motion styling is included in the docs showcase.

## Development

Use the repository's shared workspace dependencies. Run the docs app from the
repository root with `pnpm --filter @examples/docs dev`; its gallery imports
these component sources.
Component examples live beside implementations as `*.doc.tsx`. Add a description,
typed defaults and a composed preview using the helpers in `src/lib/doc.tsx`.
