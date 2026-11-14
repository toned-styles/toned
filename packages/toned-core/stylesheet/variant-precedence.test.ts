/**
 * Precedence between a part's conditions and a variant: later matching
 * declarations win each field, and a variant block comes after the part. So a
 * variant that sets a field unconditionally wins over the part's own
 * conditional value for that field (`'@md'`, `':hover'`) wherever the
 * variant applies. That is the documented rule; because it is easy to miss
 * (a Tailwind-style merge keeps the base's `md:` value), building such a
 * sheet warns in development, naming the fix: repeat the condition inside the
 * variant.
 *
 * The computed-style check runs in Chromium when Playwright is resolvable
 * (HQ's root installs it).
 */
import { createRequire } from 'node:module'
import { join } from 'node:path'

import { afterEach, beforeEach, describe, expect, test } from 'vitest'

import { buildStyles } from '../build/index.ts'
import { ui } from '../scorecard/fixture/system.ts'
import { createWebRenderer } from '../server/index.ts'
import type { Variants } from '../types/index.ts'
import { resetWarnings } from '../utils/warn.ts'

type Tone = { tone: 'quiet' | 'loud' }

const shadowing = () =>
  ui
    .stylesheet({ Root: { opacity: 1, '@md': { opacity: 0.5 } } })
    .variants(($: Variants<Tone>) => ({
      [$.tone('quiet')]: { Root: { opacity: 0 } },
    }))
const repeated = () =>
  ui
    .stylesheet({ Root: { opacity: 1, '@md': { opacity: 0.5 } } })
    .variants(($: Variants<Tone>) => ({
      [$.tone('quiet')]: { Root: { opacity: 0, '@md': { opacity: 0.5 } } },
    }))

/** The slice of Playwright this test uses; it is not a toned dependency. */
type Page = {
  setViewportSize(size: { width: number; height: number }): Promise<void>
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

let warned: string[] = []
const { warn } = console
beforeEach(() => {
  resetWarnings()
  warned = []
  console.warn = (...args: unknown[]) => void warned.push(String(args[0]))
})
afterEach(() => {
  console.warn = warn
})
const warnings = (): string[] => warned

describe('a variant beside the part’s conditions', () => {
  test('warns in development, naming the condition to repeat in the variant', () => {
    shadowing()
    const shadow = warnings().filter((text) => text.includes('Repeat'))
    expect(shadow).toHaveLength(1)
    expect(shadow[0]).toContain("Root.opacity: the variant '[tone=quiet]'")
    expect(shadow[0]).toContain("the part's '@md' value")
    expect(shadow[0]).toContain(
      "'[tone=quiet]': { Root: { '@md': { opacity: … } } }",
    )
  })

  test('the variant that repeats the condition does not warn', () => {
    repeated()
    expect(warnings().filter((text) => text.includes('Repeat'))).toEqual([])
  })

  test.skipIf(!playwright)(
    'later declarations win: the variant overrides the part at md unless it repeats @md (Chromium)',
    async () => {
      const computed = async (sheet: ReturnType<typeof shadowing>) => {
        const { css, manifest } = buildStyles(ui, { sheets: [sheet] })
        const root = createWebRenderer(ui, { manifest }).resolve(sheet, {
          variants: { tone: 'quiet' },
        }).Root as { className?: string; style: Record<string, unknown> }
        const style = Object.entries(root.style)
          .map(([key, value]) =>
            key.startsWith('--')
              ? `${key}:${value}`
              : `${key.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`)}:${value}`,
          )
          .join(';')
        const browser = await playwright!.chromium.launch()
        try {
          const page = await browser.newPage()
          const at = async (width: number) => {
            await page.setViewportSize({ width, height: 400 })
            await page.setContent(
              `<style>${css}</style><div id="r" class="${root.className ?? ''}" style="${style}"></div>`,
            )
            return page.$eval('#r', (el) => getComputedStyle(el).opacity)
          }
          return { narrow: await at(400), wide: await at(1024) }
        } finally {
          await browser.close()
        }
      }
      expect(await computed(shadowing())).toEqual({ narrow: '0', wide: '0' })
      expect(await computed(repeated())).toEqual({ narrow: '0', wide: '0.5' })
    },
  )
})
