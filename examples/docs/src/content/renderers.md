# One system, deliberate rendering

Use the renderer that matches the output you need. The capability lab resolves a real shared sheet with both document renderers, showing the exact styles they produce.

| Output | Entry point | What it delivers |
| --- | --- | --- |
| Browser | `createWebRenderer` | Generated CSS, a validated manifest, browser conditions and host updates |
| Server HTML | `createWebRenderer` | The same deterministic bags; deliver CSS and manifest together |
| Email or inline HTML | `createInlineRenderer` | Concrete web style properties, without CSS variables or a stylesheet manifest |
| PDF documents | `createPdfRenderer` | Concrete properties in the supported React PDF / Forme common profile |
| React Native | `createNativeRenderer` | Native values plus an explicitly registered native host adapter |

All constructors are exported from `@toned/core/server`. React integrates through `TonedProvider`; non-React integrations can use `renderer.resolve(sheet, variants)` directly. Renderers bind one system identity and immutable tokens. A provider can receive a renderer array for multiple systems; each stylesheet must have an unambiguous owner.

## Concrete document styles

```tsx
import { defineSystem, defineToken } from '@toned/core'
import { createInlineRenderer, createPdfRenderer } from '@toned/core/server'

const ui = defineSystem({ id: 'document', tokens: {
  space: defineToken({ values: [8, 16] as const, resolve: value => ({ padding: value }) }),
  surface: defineToken({ values: ['tint'] as const, resolve: () => ({ backgroundColor: '#eef2ff' }) }),
} })
const card = ui.stylesheet({ Root: { space: 16, surface: 'tint' } })
const email = createInlineRenderer(ui, { tokens: {} })
const pdf = createPdfRenderer(ui, { tokens: {} })
const emailProps = email.resolve(card).Root
const pdfProps = pdf.resolve(card).Root
// Spread emailProps onto an HTML element; give pdfProps.style to your PDF host.
```

A renderer produces styles, not an email delivery service or a PDF file. Use your document renderer to produce the final artifact. Test final emails in your target clients; concrete inline output does not imply universal email CSS support. Numeric dimensions in the PDF profile represent document points, not React Native density-independent pixels.

## Deliberate boundaries

Inline output rejects unresolved browser conditions, state channels, CSS variables and grid. PDF rejects unsupported browser units, transforms and grid; it is a finite document profile, not arbitrary React Native or browser CSS. Use variants and supported platform branches to author intentional alternatives. Unsupported declarations should fail explicitly rather than silently produce an incorrect document.

For browser rendering, CSS generation is a build step. Inventory every stylesheet, including lazy routes, and regenerate the stylesheet and manifest together. Server rendering never discovers missing assets. Use `buildStyles` outside Vite, or the Vite plugin and its virtual CSS/manifest modules.

## Go deeper

- [Backend contracts and integration boundaries](../../../../packages/toned-core/backends/README.md)
- [React providers and host props](../../../../packages/toned-react/README.md)
- [Native hosts and current evidence](../../../../packages/toned-react/NATIVE-HOSTS.md)
- [Maintained examples and their status](../../../../examples/README.md)
