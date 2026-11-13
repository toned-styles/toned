/**
 * The four render targets. Each is typed as its renderer's own `resolve`, so
 * the type probes check the published signature. The web target builds CSS
 * for the sheet first, as an application build would.
 */
import { buildStyles } from '../../build/index.ts'
import {
  createInlineRenderer,
  createNativeRenderer,
  createPdfRenderer,
  createWebRenderer,
} from '../../server/index.ts'
import { ui } from '../fixture/system.ts'

type Untyped = (sheet: object, ...args: unknown[]) => unknown

const web = createWebRenderer(ui, {
  manifest: buildStyles(ui, { sheets: [] }).manifest,
})
const native = createNativeRenderer(ui, { tokens: {} })
const inline = createInlineRenderer(ui, { tokens: {} })
const pdf = createPdfRenderer(ui, { tokens: {} })

const forward =
  <R>(renderer: (sheet: object) => { resolve: R }) =>
  (sheet: object, ...args: unknown[]) =>
    (renderer(sheet).resolve as Untyped)(sheet, ...args)

export const targets = {
  web: forward((sheet) =>
    createWebRenderer(ui, {
      manifest: buildStyles(ui, { sheets: [sheet] }).manifest,
    }),
  ) as unknown as typeof web.resolve,
  native: forward(() => native) as unknown as typeof native.resolve,
  inline: forward(() => inline) as unknown as typeof inline.resolve,
  pdf: forward(() => pdf) as unknown as typeof pdf.resolve,
}
