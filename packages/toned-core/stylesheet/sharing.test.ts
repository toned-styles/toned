/**
 * Instance-sharing and loud-failure behavior.
 *
 * - The compiled StyleMatcher is shared across every Base built from the same
 *   rules and css modes: compilation is pure over (rules, modes), so two
 *   Buttons need one matcher, not two compilations (and not two per SSR
 *   request).
 * - The media emitter is shared per token system: per-Base emitters leaked a
 *   matchMedia listener set per component instance for the page's life.
 * - The silent failure modes say so once in dev: a stylesheet with breakpoint
 *   styles under disabled media handling, and resolution under the default
 *   (no-platform) config.
 */
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { defineSystem, defineToken } from '../system/index.ts'
import { getConfig } from '../system/config.ts'
import { SYMBOL_INIT } from '../utils/symbols.ts'
import { resetWarnings } from '../utils/warn.ts'

const bgColor = defineToken({
  values: ['base', 'accent'] as const,
  resolve: value => ({ backgroundColor: value }),
})

const system = defineSystem(
  { bgColor },
  { breakpoints: { __breakpoints: { sm: 480, md: 768 } } },
)

const baseConfig = {
  getTokens: () => ({}),
  useClassName: false,
  useMedia: false,
  mediaMode: false as const,
  pseudoMode: 'css' as const,
  debug: false,
  getProps() {
    return {}
  },
  initRef: () => {},
  initInteraction: () => {},
}

// biome-ignore lint/suspicious/noExplicitAny: test reaches into instances
const init = (sheet: any, config: any, state = {}) => sheet[SYMBOL_INIT](config, state)

beforeEach(() => {
  resetWarnings()
})

afterEach(() => {
  vi.restoreAllMocks()
  // biome-ignore lint/suspicious/noExplicitAny: test global cleanup
  ;(globalThis as any).window = undefined
})

describe('shared compiled matcher', () => {
  test('two instances of one stylesheet share a matcher', () => {
    const sheet = system.stylesheet({ root: { bgColor: 'base' } })
    const a = init(sheet, { ...baseConfig })
    const b = init(sheet, { ...baseConfig })
    expect(a.matcher).toBe(b.matcher)
  })

  test('different css modes get different matchers', () => {
    const sheet = system.stylesheet({ root: { bgColor: 'base' } })
    const a = init(sheet, { ...baseConfig, mediaMode: 'css' as const })
    const b = init(sheet, { ...baseConfig, mediaMode: false as const })
    expect(a.matcher).not.toBe(b.matcher)
  })

  test('different stylesheets never share', () => {
    const a = init(system.stylesheet({ root: { bgColor: 'base' } }), { ...baseConfig })
    const b = init(system.stylesheet({ root: { bgColor: 'accent' } }), { ...baseConfig })
    expect(a.matcher).not.toBe(b.matcher)
  })
})

describe('shared media emitter', () => {
  test('runtime media mode registers matchMedia listeners once per system, not per instance', () => {
    const addListener = vi.fn()
    const matchMedia = vi.fn(() => ({ matches: false, addListener }))
    // biome-ignore lint/suspicious/noExplicitAny: test window stub
    ;(globalThis as any).window = { matchMedia }

    const sheet = system.stylesheet({ root: { bgColor: 'base' } })
    const runtimeConfig = { ...baseConfig, useMedia: true, mediaMode: 'runtime' as const }
    init(sheet, runtimeConfig)
    const callsAfterFirst = matchMedia.mock.calls.length
    expect(callsAfterFirst).toBeGreaterThan(0)

    init(sheet, runtimeConfig)
    init(system.stylesheet({ root: { bgColor: 'accent' } }), runtimeConfig)
    expect(matchMedia.mock.calls.length).toBe(callsAfterFirst)
  })
})

describe('loud failure modes', () => {
  test('breakpoint styles under disabled media handling warn once', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const sheet = system.stylesheet({
      root: { bgColor: 'base', '@md': { bgColor: 'accent' } },
    })
    init(sheet, { ...baseConfig, mediaMode: false as const })
    init(sheet, { ...baseConfig, mediaMode: false as const })
    const hits = warn.mock.calls.filter(c => String(c[0]).includes('silently dropped'))
    expect(hits.length).toBe(1)
  })

  test('a stylesheet without breakpoint styles does not warn', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    init(system.stylesheet({ root: { bgColor: 'base' } }), {
      ...baseConfig,
      mediaMode: false as const,
    })
    expect(warn.mock.calls.filter(c => String(c[0]).includes('silently dropped')).length).toBe(0)
  })

  test('resolving under the default config names the missing platform install', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    getConfig().getProps.call({} as never, 'root')
    getConfig().getProps.call({} as never, 'root')
    const hits = warn.mock.calls.filter(c => String(c[0]).includes('platform config'))
    expect(hits.length).toBe(1)
  })

  test('cross-element pseudo under css pseudo mode says it runs through runtime handlers', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const sheet = system.stylesheet({
      root: { bgColor: 'base' },
      label: { bgColor: 'base' },
      'root:hover': { label: { bgColor: 'accent' } },
    })
    init(sheet, { ...baseConfig, pseudoMode: 'css' as const })
    const hits = warn.mock.calls.filter(c => String(c[0]).includes('cross-element'))
    expect(hits.length).toBe(1)
  })
})
