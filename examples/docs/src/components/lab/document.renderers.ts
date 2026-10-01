import { createInlineRenderer, createPdfRenderer } from '@toned/core/server'

import { documentSystem } from './document.system.ts'

/** Concrete web style properties: no CSS variables, no stylesheet. */
export const inline = createInlineRenderer(documentSystem, { tokens: {} })

/** The PDF profile: numeric dimensions are document points. */
export const pdf = createPdfRenderer(documentSystem, { tokens: {} })
