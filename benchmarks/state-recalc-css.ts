/** Worker for state-recalc.mjs: prints, as JSON, the system CSS a toned core
 * generates for 0..N declared states. Run with Bun:
 *   bun benchmarks/state-recalc-css.ts <core directory> <form> <counts…>
 * `form` is `string` (each state declared by its selector alone) or
 * `relations` (each state declares both relation channels, which reproduces
 * what every state cost before relations were opt-in). The states use one
 * attribute, as a component library's `data-state` values do.
 *
 * For a list inside a context: `context` declares N contexts `c<i>`, each
 * with the values `v0` and `v1` (system/contexts.ts); `ancestor-selector`
 * declares the hand-written equivalent the HQ website uses today, N states
 * `in-c<i>-v0: ':where([data-prose="c<i>-v0"] *)'`. */
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'

const FORMS = ['string', 'relations', 'context', 'ancestor-selector']
const [coreDir, form, ...counts] = process.argv.slice(2)
if (!coreDir || !FORMS.includes(form!) || !counts.length)
  throw new Error(
    `usage: bun state-recalc-css.ts <core directory> ${FORMS.join('|')} <counts…>`,
  )
const load = (path: string) => import(pathToFileURL(join(coreDir, path)).href)
const { defineSystem, defineToken } = await load('index.ts')
const { buildStyles } = await load('build/index.ts')

const gap = defineToken({ values: [1], resolve: (gap: number) => ({ gap }) })
const css: Record<string, string> = {}
for (const count of counts.map(Number)) {
  if (form === 'context' || form === 'ancestor-selector') {
    const names = Array.from({ length: count }, (_, index) => `c${index}`)
    const conditions =
      form === 'context'
        ? {
            contexts: Object.fromEntries(
              names.map((name) => [name, { values: ['v0', 'v1'] }]),
            ),
          }
        : {
            states: Object.fromEntries(
              names.map((name) => [
                `in-${name}-v0`,
                `:where([data-prose="${name}-v0"] *)`,
              ]),
            ),
          }
    css[count] = buildStyles(
      defineSystem({ id: 'bench', tokens: { gap }, conditions }),
      { sheets: [] },
    ).css
    continue
  }
  const states = Object.fromEntries(
    Array.from({ length: count }, (_, index) => {
      const selector = `[data-state='v${index}']`
      return [
        `v${index}`,
        form === 'string'
          ? selector
          : { selector, relations: ['ancestor', 'sibling'] },
      ]
    }),
  )
  css[count] = buildStyles(
    defineSystem({ id: 'bench', tokens: { gap }, conditions: { states } }),
    { sheets: [] },
  ).css
}
process.stdout.write(JSON.stringify(css))
