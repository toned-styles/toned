/**
 * The build never reads a stylesheet: `buildStyles` output depends on the
 * system declaration alone. A width threshold a sheet uses must be declared
 * (`conditions.widths`); the deprecated `$webRules` extension is the one
 * thing `sheets` still feeds.
 */
import { afterEach, describe, expect, it, vi } from 'vitest'

import { defineSystem, dp } from '../index.ts'
import { createWebRenderer } from '../server/index.ts'
import { resetWarnings } from '../utils/warn.ts'
import { webRules } from '../web/rules.ts'
import { buildStyles } from './index.ts'

const declared = () =>
  defineSystem({
    id: 'purity',
    tokens: {},
    conditions: {
      media: { md: 768 },
      containers: { card: {} },
      widths: { media: [600, 900], containers: { card: [300] } },
    },
  })

/** The builders called with a width the compiler cannot see. */
const media = (ui: { q: object }, width: number): string =>
  (ui.q as { media: (value: unknown) => string }).media(dp(width))
const container = (ui: { q: object }, width: number): string =>
  (ui.q as { container: (name: string, value: unknown) => string }).container(
    'card',
    dp(width),
  )

afterEach(() => {
  resetWarnings()
  vi.restoreAllMocks()
})

describe('declared widths', () => {
  it('are built from the system, with or without the sheets that use them', () => {
    const ui = declared()
    const alone = buildStyles(ui)
    expect(alone.manifest.conditions).toEqual([
      '>=600px',
      '>=900px',
      'card/>=300px',
    ])
    expect(alone.css).toContain('(min-width: 600px)')
    expect(alone.css).toContain('@container card (min-width: 300px)')
    const sheet = ui.stylesheet((q) => ({
      Root: {
        [q.media(dp(600))]: { $style: { opacity: 0 } },
        [q.container('card', dp(300))]: { $style: { opacity: 1 } },
      },
    }))
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    expect(buildStyles(ui, { sheets: [sheet] })).toEqual(alone)
    const web = createWebRenderer(ui, { manifest: alone.manifest })
    expect(JSON.stringify(web.resolve(sheet))).toContain('fixed-media-gte600px')
  })

  it('enter the manifest definition, so a changed list is a changed system', () => {
    const other = defineSystem({
      id: 'purity',
      tokens: {},
      conditions: {
        media: { md: 768 },
        containers: { card: {} },
        widths: { media: [600], containers: { card: [300] } },
      },
    })
    expect(buildStyles(other).manifest.definition).not.toBe(
      buildStyles(declared()).manifest.definition,
    )
  })

  it('refuse a malformed list at definition', () => {
    expect(() =>
      defineSystem({
        id: 'bad-widths',
        tokens: {},
        conditions: { widths: { media: [-1] } },
      }),
    ).toThrow(/widths\.media/)
    expect(() =>
      defineSystem({
        id: 'bad-widths',
        tokens: {},
        conditions: { widths: { containers: { card: [300] } } },
      }),
    ).toThrow(/declare the container 'card' in conditions\.containers/)
  })
})

describe('an undeclared width', () => {
  it('is refused when the sheet is created, naming where to declare it', () => {
    const ui = declared()
    // Where types cannot see the width (a computed number, an untyped key).
    expect(() =>
      ui.stylesheet({
        Root: { [media(ui, 700)]: { $style: { opacity: 0 } } },
      } as never),
    ).toThrow(/'@>=700px'.*add 700 to conditions\.widths\.media/)
    expect(() =>
      ui.stylesheet({
        Root: { [container(ui, 400)]: { $style: { opacity: 0 } } },
      } as never),
    ).toThrow(
      /'@card\/>=400px'.*add 400 to conditions\.widths\.containers\.card/,
    )
  })

  it('is refused inside compound expressions and derived sheets', () => {
    const ui = declared()
    expect(() =>
      ui.stylesheet({
        Root: { '@md&!>=700px': { $style: { opacity: 0 } } },
      } as never),
    ).toThrow(/conditions\.widths\.media/)
    const base = ui.stylesheet({ Root: { $style: { opacity: 1 } } })
    expect(() =>
      base.extend({
        Root: { [media(ui, 1200)]: { $style: { opacity: 0 } } },
      } as never),
    ).toThrow(/add 1200 to conditions\.widths\.media/)
  })

  it('is refused in a system that declares no widths at all', () => {
    const ui = defineSystem({ id: 'no-widths', tokens: {} })
    expect(() =>
      ui.stylesheet({
        Root: { [media(ui, 600)]: { $style: { opacity: 0 } } },
      } as never),
    ).toThrow(/add 600 to conditions\.widths\.media/)
  })

  it('is refused by the conditions option of buildStyles', () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    expect(() => buildStyles(declared(), { conditions: ['>=700px'] })).toThrow(
      /add 700 to conditions\.widths\.media/,
    )
    expect(buildStyles(declared(), { conditions: ['>=600px'] })).toEqual(
      buildStyles(declared()),
    )
  })
})

describe('the deprecated inputs', () => {
  it('sheets without $webRules change nothing, and say so once in development', () => {
    const ui = declared()
    const sheet = ui.stylesheet({ Root: { $style: { opacity: 1 } } })
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    expect(buildStyles(ui, { sheets: [sheet] })).toEqual(buildStyles(ui))
    expect(warn.mock.calls.join(' ')).toMatch(
      /Toned deprecated: buildStyles\(\{ sheets \}\) no longer changes the output/,
    )
    expect(buildStyles(ui, { sheets: [] })).toEqual(buildStyles(ui))
  })

  it('$webRules is still built from sheets, and warns naming the replacements', () => {
    const ui = declared()
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const sheet = ui.stylesheet({
      Root: {
        '@platform web': {
          $webRules: webRules({ '&::before': { content: '"*"' } }),
        },
      },
    })
    const artifact = buildStyles(ui, { sheets: [sheet] })
    expect(artifact.manifest.extensions).toHaveLength(1)
    expect(artifact.css).toContain('::before')
    const message = warn.mock.calls.join(' ')
    expect(message).toMatch(/Toned deprecated: \$webRules/)
    expect(message).toMatch(/declared states/)
    expect(message).toMatch(/relations/)
  })
})
