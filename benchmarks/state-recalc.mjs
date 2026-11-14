/** Browser style-recalculation cost of declared states. Run with Node:
 *   node benchmarks/state-recalc.mjs [revision] [--rows=100,500,1000] [--states=0,51,211]
 * Needs Playwright with Chromium, resolved from the working directory first
 * (HQ's root has it) and then from this repository. A revision is extracted
 * with `git archive` into a temporary directory and measured beside the
 * current sources with identical markup; the working tree is not changed.
 *
 * The page lays out R rows side by side in one flex container (siblings, as a
 * table's rows or a document's blocks are), each a source part (`._ _s`) with
 * nine styled children: 10 R + 1 elements. Every row reads one state's toggle
 * through a custom-property chain. For each system CSS it measures Chromium's
 * RecalcStyleDuration (CDP Performance metrics) for the first style pass and
 * for changing one middle row's `data-state`, as the median of 7 rounds.
 *
 * The run asserts what it measures: the toggled row answers the state, its
 * children and the following row do not. */
import { spawnSync } from 'node:child_process'
import { mkdtempSync, rmSync } from 'node:fs'
import { createRequire } from 'node:module'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('../', import.meta.url))
const args = process.argv.slice(2)
const option = (name, fallback) =>
  (args.find((arg) => arg.startsWith(`--${name}=`))?.split('=')[1] ?? fallback)
    .split(',')
    .map(Number)
const revision = args.find((arg) => !arg.startsWith('--'))
const rowCounts = option('rows', '100,500,1000')
const stateCounts = option('states', '0,51,211')
if (!stateCounts.includes(0)) stateCounts.unshift(0)
const ROUNDS = 7

const resolvePlaywright = () => {
  for (const base of [join(process.cwd(), 'package.json'), import.meta.url]) {
    try {
      return createRequire(base)('playwright')
    } catch {}
  }
  throw new Error(
    'state-recalc: playwright is not resolvable; run from a checkout that has it installed (HQ root)',
  )
}

const generate = (coreDir, form) => {
  const run = spawnSync(
    'bun',
    [
      join(root, 'benchmarks/state-recalc-css.ts'),
      coreDir,
      form,
      ...stateCounts.map(String),
    ],
    { cwd: root, encoding: 'utf8', maxBuffer: 256 * 1024 * 1024 },
  )
  if (run.status !== 0) throw new Error(run.stderr || 'CSS worker failed')
  return JSON.parse(run.stdout)
}

const markup = (rows) => {
  let html = '<div id="list" style="display:flex;flex-wrap:wrap">'
  for (let row = 0; row < rows; row++) {
    html += `<div class="_ _s" data-state="v1" style="outline-style:solid;outline-color:var(--bench-toned_v0, rgb(255, 0, 0))">`
    for (let child = 0; child < 9; child++)
      html += `<span class="_" style="outline-style:solid;outline-color:var(--bench-toned_v0, rgb(255, 0, 0))">x</span>`
    html += '</div>'
  }
  return `${html}</div>`
}

const median = (values) => {
  const sorted = [...values].sort((a, b) => a - b)
  return sorted[Math.floor(sorted.length / 2)]
}

async function measure(browser, css, rows) {
  const page = await browser.newPage()
  const cdp = await page.context().newCDPSession(page)
  await cdp.send('Performance.enable')
  const recalc = async () =>
    (await cdp.send('Performance.getMetrics')).metrics.find(
      (metric) => metric.name === 'RecalcStyleDuration',
    ).value * 1000
  const initial = []
  const toggle = []
  for (let round = 0; round < ROUNDS; round++) {
    await page.setContent(`<style>${css}</style><body></body>`)
    await page.evaluate(() => getComputedStyle(document.body).color)
    let before = await recalc()
    await page.evaluate((html) => {
      document.body.innerHTML = html
      return getComputedStyle(document.body.lastElementChild.lastElementChild)
        .color
    }, markup(rows))
    initial.push((await recalc()) - before)
    const middle = Math.floor(rows / 2)
    before = await recalc()
    const answers = await page.evaluate((index) => {
      const list = document.getElementById('list')
      const row = list.children[index]
      row.setAttribute('data-state', 'v0')
      const paint = (element) => getComputedStyle(element).outlineColor
      return [
        paint(row),
        paint(row.firstElementChild),
        paint(list.children[index + 1]),
      ]
    }, middle)
    toggle.push((await recalc()) - before)
    if (round === 0 && css.includes('toned_v0')) {
      const [own, child, next] = answers
      const red = 'rgb(255, 0, 0)'
      if (own === red || child !== red || next !== red)
        throw new Error(
          `state-recalc: wrong answer (row ${own}, child ${child}, next ${next})`,
        )
    }
  }
  await page.close()
  return { initialMs: median(initial), toggleMs: median(toggle) }
}

let temp
try {
  const cores = [
    {
      name: 'current',
      css: {
        string: generate(join(root, 'packages/toned-core'), 'string'),
        relations: generate(join(root, 'packages/toned-core'), 'relations'),
      },
    },
  ]
  if (revision) {
    temp = mkdtempSync(join(tmpdir(), 'toned-state-recalc-'))
    const archive = spawnSync(
      'git',
      ['archive', revision, 'packages/toned-core'],
      { cwd: root, maxBuffer: 64 * 1024 * 1024 },
    )
    if (archive.status !== 0) throw new Error(String(archive.stderr))
    const extract = spawnSync('tar', ['-x', '-C', temp], {
      input: archive.stdout,
    })
    if (extract.status !== 0) throw new Error(String(extract.stderr))
    cores.unshift({
      name: revision,
      css: { string: generate(join(temp, 'packages/toned-core'), 'string') },
    })
  }
  const { chromium } = resolvePlaywright()
  const browser = await chromium.launch()
  const version = browser.version()
  const results = []
  try {
    for (const core of cores)
      for (const [form, byCount] of Object.entries(core.css))
        for (const rows of rowCounts) {
          const elements = rows * 10 + 1
          const baseline = await measure(browser, byCount[0], rows)
          for (const states of stateCounts.filter((count) => count > 0)) {
            const timing = await measure(browser, byCount[states], rows)
            const perState = (key) =>
              Number(
                (
                  Math.max(0, timing[key] - baseline[key]) /
                  states /
                  (elements / 1000)
                ).toFixed(4),
              )
            results.push({
              core: core.name,
              form,
              states,
              elements,
              initialMs: Number(timing.initialMs.toFixed(2)),
              toggleMs: Number(timing.toggleMs.toFixed(2)),
              noStatesInitialMs: Number(baseline.initialMs.toFixed(2)),
              noStatesToggleMs: Number(baseline.toggleMs.toFixed(2)),
              initialMsPerStatePer1000: perState('initialMs'),
              toggleMsPerStatePer1000: perState('toggleMs'),
              cssBytes: byCount[states].length,
            })
          }
        }
  } finally {
    await browser.close()
  }
  process.stdout.write(
    `${JSON.stringify({ chromium: version, rounds: ROUNDS, results }, null, 2)}\n`,
  )
} finally {
  if (temp) rmSync(temp, { recursive: true, force: true })
}
