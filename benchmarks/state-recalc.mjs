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
 * children and the following row do not.
 *
 * `--contexts=0,10,40` adds a list inside a context: the same rows inside
 * one provider element, every element reading the provider's value through
 * a custom-property chain, for N declared contexts (`context`) and for the
 * hand-written ancestor selector states they replace (`ancestor-selector`,
 * `:where([data-prose="…"] *)`). The toggle changes the provider's value,
 * which every row answers; an element after the provider must not. */
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
const contextCounts = args.some((arg) => arg.startsWith('--contexts='))
  ? option('contexts', '0')
  : []
if (contextCounts.length && !contextCounts.includes(0)) contextCounts.unshift(0)
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

const generate = (coreDir, form, counts = stateCounts) => {
  const run = spawnSync(
    'bun',
    [
      join(root, 'benchmarks/state-recalc-css.ts'),
      coreDir,
      form,
      ...counts.map(String),
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

/** Rows inside one provider; `variable` is the toggle each element reads. */
const contextMarkup = (rows, variable) => {
  const read = `outline-style:solid;outline-color:var(${variable}, rgb(255, 0, 0))`
  let html =
    '<div id="provider" class="_ bench--_cx_c0 bench--_cx_c0_v1" data-prose="c0-v1"><div id="list" style="display:flex;flex-wrap:wrap">'
  for (let row = 0; row < rows; row++) {
    html += `<div class="_" style="${read}">`
    for (let child = 0; child < 9; child++)
      html += `<span class="_" style="${read}">x</span>`
    html += '</div>'
  }
  return `${html}</div></div><div id="outside" class="_" style="${read}"></div>`
}

async function measureContext(browser, css, rows, variable, check) {
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
    const resting = await page.evaluate(
      (html) => {
        document.body.innerHTML = html
        return getComputedStyle(document.querySelector('#list span'))
          .outlineColor
      },
      contextMarkup(rows, variable),
    )
    initial.push((await recalc()) - before)
    before = await recalc()
    const answers = await page.evaluate(() => {
      const provider = document.getElementById('provider')
      provider.className = '_ bench--_cx_c0 bench--_cx_c0_v0'
      provider.setAttribute('data-prose', 'c0-v0')
      const paint = (element) => getComputedStyle(element).outlineColor
      const list = document.getElementById('list')
      return [
        paint(list.lastElementChild.lastElementChild),
        paint(document.getElementById('outside')),
      ]
    })
    toggle.push((await recalc()) - before)
    if (round === 0 && check) {
      const red = 'rgb(255, 0, 0)'
      const [inside, outside] = answers
      if (resting !== red || inside === red || outside !== red)
        throw new Error(
          `state-recalc: wrong context answer (resting ${resting}, inside ${inside}, outside ${outside})`,
        )
    }
  }
  await page.close()
  return { initialMs: median(initial), toggleMs: median(toggle) }
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
  const contextResults = []
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
    if (contextCounts.length) {
      const coreDir = join(root, 'packages/toned-core')
      const forms = {
        context: '--bench-toned_cx_c0_v0',
        'ancestor-selector': '--bench-toned_in-c0-v0',
      }
      for (const [form, variable] of Object.entries(forms)) {
        const byCount = generate(coreDir, form, contextCounts)
        for (const rows of rowCounts) {
          const elements = rows * 10 + 2
          const baseline = await measureContext(
            browser,
            byCount[0],
            rows,
            variable,
            false,
          )
          for (const count of contextCounts.filter((n) => n > 0)) {
            const timing = await measureContext(
              browser,
              byCount[count],
              rows,
              variable,
              true,
            )
            contextResults.push({
              form,
              declared: count,
              elements,
              initialMs: Number(timing.initialMs.toFixed(2)),
              toggleMs: Number(timing.toggleMs.toFixed(2)),
              noneInitialMs: Number(baseline.initialMs.toFixed(2)),
              noneToggleMs: Number(baseline.toggleMs.toFixed(2)),
              cssBytes: byCount[count].length - byCount[0].length,
            })
          }
        }
      }
    }
  } finally {
    await browser.close()
  }
  process.stdout.write(
    `${JSON.stringify({ chromium: version, rounds: ROUNDS, results, ...(contextResults.length ? { contextResults } : {}) }, null, 2)}\n`,
  )
} finally {
  if (temp) rmSync(temp, { recursive: true, force: true })
}
