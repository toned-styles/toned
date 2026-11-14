/** Browser check: Chromium computes the styles toned's CSS output promises
 * where a cascade detail decides the answer. Run with Node:
 *   node benchmarks/cascade-browser.mjs
 * Needs Playwright with Chromium, resolved from the working directory first
 * (HQ's root has it) and then from this repository.
 *
 * Each case sets a shorthand and one of its longhands on one part, one of them
 * only while a declared state holds (`cascade-browser-cases.ts`). Each part
 * renders twice, nested: the outer element in the state, its child not, so the
 * check also proves a state toggle never reaches a descendant. Exits non-zero
 * on the first wrong computed value. */
import { spawnSync } from 'node:child_process'
import { createRequire } from 'node:module'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('../', import.meta.url))

const resolvePlaywright = () => {
  for (const base of [join(process.cwd(), 'package.json'), import.meta.url]) {
    try {
      return createRequire(base)('playwright')
    } catch {}
  }
  throw new Error(
    'cascade-browser: playwright is not resolvable; run from a checkout that has it installed (HQ root)',
  )
}

const worker = spawnSync(
  'bun',
  [join(root, 'benchmarks/cascade-browser-cases.ts')],
  { cwd: root, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 },
)
if (worker.status !== 0) throw new Error(worker.stderr || 'case worker failed')
const { css, cases } = JSON.parse(worker.stdout)

const escape = (text) => text.replace(/&/g, '&amp;').replace(/"/g, '&quot;')
let body = ''
cases.forEach((entry, index) => {
  const attributes = (state) =>
    `class="${escape(entry.className)}" style="${escape(entry.style)}"${state ? ` data-state="${state}"` : ''}`
  body += `<div id="off-${index}" ${attributes('')}></div>`
  body += `<div id="on-${index}" ${attributes('open')}><div id="child-${index}" ${attributes('')}></div></div>`
})

const { chromium } = resolvePlaywright()
const browser = await chromium.launch()
const failures = []
let checked = 0
try {
  const page = await browser.newPage()
  await page.setContent(`<style>${css}</style>${body}`)
  const computed = await page.evaluate(
    (all) =>
      all.map((entry, index) => {
        const read = (id, properties) => {
          const style = getComputedStyle(document.getElementById(id))
          return Object.fromEntries(
            properties.map((property) => [
              property,
              style.getPropertyValue(property),
            ]),
          )
        }
        return {
          off: read(`off-${index}`, Object.keys(entry.off)),
          on: read(`on-${index}`, Object.keys(entry.on)),
          child: read(`child-${index}`, Object.keys(entry.off)),
        }
      }),
    cases,
  )
  cases.forEach((entry, index) => {
    for (const [where, expected] of [
      ['off', entry.off],
      ['on', entry.on],
      ['child', entry.off],
    ])
      for (const [property, value] of Object.entries(expected)) {
        checked++
        const actual = computed[index][where][property]
        if (actual !== value)
          failures.push(
            `${entry.name} (${where}): ${property} is ${JSON.stringify(actual)}, expected ${JSON.stringify(value)}`,
          )
      }
  })
  process.stdout.write(
    `${JSON.stringify({ chromium: browser.version(), cases: cases.length, checked, failures }, null, 2)}\n`,
  )
} finally {
  await browser.close()
}
if (failures.length) process.exitCode = 1
