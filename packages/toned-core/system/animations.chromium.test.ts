/**
 * Reduced motion as Chromium computes it: each mode's resting value, an
 * animation applied under a condition (written inline, with no class), and a
 * part's override. Runs when Playwright is resolvable (HQ's root installs it).
 */
import { createRequire } from 'node:module'
import { join } from 'node:path'

import { afterAll, beforeAll, describe, expect, test } from 'vitest'

import { buildStyles } from '../build/index.ts'
import { createWebRenderer } from '../server/index.ts'
import { defineAnimations, defineSystem } from './index.ts'

const motion = defineAnimations({
  pulse: {
    keyframes: { '50%': { opacity: 0.25 } },
    duration: 2000,
    iterations: 'infinite',
    reducedMotion: 'none',
  },
  fade: {
    keyframes: { from: { opacity: 0 }, to: { opacity: 0.75 } },
    duration: 60000,
    reducedMotion: 'end',
  },
  glow: {
    keyframes: {
      '0%, 100%': { boxShadow: '0 0 4px red' },
      '50%': { boxShadow: '0 0 8px blue' },
    },
    duration: 4000,
    iterations: 'infinite',
    reducedMotion: { at: '50%' },
  },
  status: {
    keyframes: { '75%, 100%': { opacity: 0 } },
    duration: 1000,
    iterations: 'infinite',
    reducedMotion: 'keep',
  },
})
const ui = defineSystem({
  id: 'anim-browser',
  tokens: { ...motion.tokens },
  conditions: {
    animations: motion.animations,
    states: { open: '[data-open]' },
  },
})
const { css, manifest } = buildStyles(ui)
const parts = createWebRenderer(ui, { manifest }).resolve(
  ui.stylesheet({
    Pulse: { animation: 'pulse' },
    Fade: { animation: 'fade' },
    Glow: { animation: 'glow' },
    Status: { animation: 'status' },
    // Applied under a state: written inline, so no class carries it.
    Opened: { ':open': { animation: 'pulse' } },
    // A part keeps an animation its system stops.
    Kept: { animation: 'pulse', reducedMotion: 'keep' },
    // And rests one its system keeps.
    Rested: { animation: 'status', reducedMotion: { at: '75%' } },
  }),
)

const element = (id: keyof typeof parts, attributes = '') => {
  const { className = '', style = {} } = parts[id]
  const inline = Object.entries(style as Record<string, string>)
    .map(([key, value]) =>
      key.startsWith('--')
        ? `${key}:${value}`
        : `${key.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`)}:${value}`,
    )
    .join(';')
  return `<div id="${id}" class="${className}" style="${inline}" ${attributes}></div>`
}
const html = `<style>${css}</style>${[
  element('Pulse'),
  element('Fade'),
  element('Glow'),
  element('Status'),
  element('Opened', 'data-open'),
  element('Kept'),
  element('Rested'),
].join('')}`

/** The slice of Playwright this test uses; it is not a toned dependency. */
type Page = {
  emulateMedia(options: {
    reducedMotion: 'reduce' | 'no-preference'
  }): Promise<void>
  setContent(html: string): Promise<void>
  evaluate<T, A>(fn: (arg: A) => T, arg: A): Promise<T>
}
type Browser = { newPage(): Promise<Page>; close(): Promise<void> }
type Playwright = { chromium: { launch(): Promise<Browser> } }
const resolvePlaywright = (): Playwright | undefined => {
  for (const base of [join(process.cwd(), 'package.json'), import.meta.url]) {
    try {
      return createRequire(base)('playwright')
    } catch {}
  }
  return undefined
}
const playwright = resolvePlaywright()

/** Each element's computed opacity and shadow, and whether its animation has frames. */
const read = (page: Page) =>
  page.evaluate(
    (ids: string[]) =>
      Object.fromEntries(
        ids.map((id) => {
          const el = document.getElementById(id)!
          const computed = getComputedStyle(el)
          const animation = el.getAnimations()[0] as CSSAnimation | undefined
          const frames =
            (animation?.effect as KeyframeEffect | null)?.getKeyframes() ?? []
          return [
            id,
            {
              opacity: computed.opacity,
              boxShadow: computed.boxShadow,
              name: computed.animationName,
              frames: frames.length,
            },
          ]
        }),
      ),
    Object.keys(parts),
  )

describe.skipIf(!playwright)('reduced motion in Chromium', () => {
  let browser: Browser
  let reduced: Awaited<ReturnType<typeof read>>
  let moving: Awaited<ReturnType<typeof read>>
  beforeAll(async () => {
    browser = await playwright!.chromium.launch()
    const page = await browser.newPage()
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.setContent(html)
    reduced = await read(page)
    await page.emulateMedia({ reducedMotion: 'no-preference' })
    await page.setContent(html)
    moving = await read(page)
  }, 30000)
  afterAll(() => browser?.close())

  test("'none' leaves the element's own style", () => {
    expect(reduced['Pulse']).toMatchObject({ opacity: '1', frames: 0 })
  })

  test("'end' rests on the last frame, '{ at }' on its offset", () => {
    expect(reduced['Fade']?.opacity).toBe('0.75')
    expect(reduced['Glow']?.boxShadow).toBe('rgb(0, 0, 255) 0px 0px 8px 0px')
  })

  test("'keep' still animates", () => {
    expect(reduced['Status']?.frames).toBeGreaterThan(0)
  })

  test('an animation applied under a condition, inline, follows its mode too', () => {
    expect(reduced['Opened']?.name).toBe('anim-browser-toned_pulse')
    expect(reduced['Opened']).toMatchObject({ opacity: '1', frames: 0 })
  })

  test("a part's override replaces the default", () => {
    expect(reduced['Kept']?.frames).toBeGreaterThan(0)
    expect(reduced['Rested']).toMatchObject({ opacity: '0', frames: 2 })
  })

  test('without reduced motion every animation plays its authored keyframes', () => {
    for (const id of ['Pulse', 'Glow', 'Status', 'Opened', 'Kept', 'Rested'])
      expect(moving[id]?.frames, id).toBeGreaterThan(1)
    // A minute-long fade has barely started.
    expect(Number(moving['Fade']?.opacity)).toBeLessThan(0.1)
  })
})
