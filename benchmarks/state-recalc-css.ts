/** Worker for state-recalc.mjs: prints, as JSON, the system CSS a toned core
 * generates for 0..N declared states. Run with Bun:
 *   bun benchmarks/state-recalc-css.ts <core directory> <form> <counts…>
 * `form` is `string` (each state declared by its selector alone) or
 * `relations` (each state declares both relation channels, which reproduces
 * what every state cost before relations were opt-in). The states use one
 * attribute, as a component library's `data-state` values do. */
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'

const [coreDir, form, ...counts] = process.argv.slice(2)
if (!coreDir || (form !== 'string' && form !== 'relations') || !counts.length)
  throw new Error(
    'usage: bun state-recalc-css.ts <core directory> string|relations <counts…>',
  )
const load = (path: string) => import(pathToFileURL(join(coreDir, path)).href)
const { defineSystem, defineToken } = await load('index.ts')
const { buildStyles } = await load('build/index.ts')

const gap = defineToken({ values: [1], resolve: (gap: number) => ({ gap }) })
const css: Record<string, string> = {}
for (const count of counts.map(Number)) {
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
