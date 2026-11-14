/**
 * A bridge parameter keeps its name in every system, so two systems on one
 * page share it, and each system's resting reset (`--toned-b-*: initial` on
 * every `._` element) must never beat the other system's setter class. The
 * reset carries no specificity (`:where(._)`), so any setter class wins
 * whichever system's CSS comes later in the bundle.
 *
 * The computed-style check runs in Chromium when Playwright is resolvable
 * (HQ's root installs it); the CSS shape check always runs.
 */
import { createRequire } from 'node:module'
import { join } from 'node:path'

import { describe, expect, test } from 'vitest'

import { buildStyles } from '../build/index.ts'
import { bridgeVarName } from '../utils/css.ts'
import { defineSystem, defineToken } from './index.ts'

const bridges = {
  placeholder: { selector: '::placeholder', properties: ['color'] },
} as const

const system = (id: string, paint: Record<'muted' | 'ink', string>) =>
  defineSystem({
    id,
    tokens: {
      placeholderColor: defineToken({
        values: ['muted', 'ink'] as const,
        resolve: (value: 'muted' | 'ink') => ({
          [bridgeVarName('placeholder', 'color')]: paint[value],
        }),
      }),
    },
    conditions: { bridges },
  })

const carehome = system('carehome', {
  muted: 'rgb(31, 44, 58)',
  ink: 'rgb(0, 0, 0)',
})
const daylight = system('daylight', {
  muted: 'rgb(92, 103, 118)',
  ink: 'rgb(1, 1, 1)',
})
const css = (ui: typeof carehome) => buildStyles(ui, { sheets: [] }).css

/** The slice of Playwright this test uses; it is not a toned dependency. */
type Page = {
  setContent(html: string): Promise<void>
  $eval<T>(selector: string, fn: (el: Element) => T): Promise<T>
}
type Playwright = {
  chromium: {
    launch(): Promise<{ newPage(): Promise<Page>; close(): Promise<void> }>
  }
}

const resolvePlaywright = (): Playwright | undefined => {
  for (const base of [join(process.cwd(), 'package.json'), import.meta.url]) {
    try {
      return createRequire(base)('playwright')
    } catch {}
  }
  return undefined
}
const playwright = resolvePlaywright()

describe('bridge reset across systems', () => {
  test('the reset carries no specificity, so a setter class beats it on any order', () => {
    for (const ui of [carehome, daylight]) {
      expect(css(ui)).toContain(
        ':where(._) {--toned-b-placeholder-color: initial;}',
      )
      expect(css(ui)).not.toMatch(/(^|\})\s*\._ \{--toned-b-/)
    }
  })

  test.skipIf(!playwright)(
    "one system's reset never beats another system's setter class (Chromium)",
    async () => {
      const browser = await playwright!.chromium.launch()
      try {
        const page = await browser.newPage()
        for (const bundle of [
          css(daylight) + css(carehome),
          css(carehome) + css(daylight),
        ]) {
          await page.setContent(
            `<style>${bundle}</style>` +
              '<input id="d" placeholder="x" class="_ daylight--placeholderColor_muted">' +
              '<input id="c" placeholder="x" class="_ carehome--placeholderColor_muted">' +
              '<div class="_ daylight--placeholderColor_muted"><input id="n" placeholder="x" class="_"></div>',
          )
          const placeholder = (id: string) =>
            page.$eval(
              `#${id}`,
              (el) => getComputedStyle(el, '::placeholder').color,
            )
          expect(await placeholder('d')).toBe('rgb(92, 103, 118)')
          expect(await placeholder('c')).toBe('rgb(31, 44, 58)')
          // The reset still stops a parameter at a component boundary.
          expect(await placeholder('n')).toBe(
            await page.$eval('#n', (el) => getComputedStyle(el).color),
          )
        }
      } finally {
        await browser.close()
      }
    },
  )
})
