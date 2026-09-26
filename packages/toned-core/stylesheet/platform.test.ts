/**
 * `'@platform.<name>'` keys resolve statically against the running config's
 * platform: matching blocks merge in (winning over siblings), foreign blocks
 * drop, and rules without platform keys keep their identity so matcher
 * sharing is unaffected.
 */
import { describe, expect, test } from 'vitest'
import { defineGrid, fr } from '../grid/index.ts'
import { RULE_LAYERS } from './rule-protocol.ts'
import { defineSystem, defineToken } from '../system/index.ts'
import { resolvePlatformKeys } from '../utils/platform.ts'
import { SYMBOL_INIT } from '../utils/symbols.ts'

const bgColor = defineToken({
  values: ['base', 'accent', 'muted'] as const,
  resolve: (value) => ({ backgroundColor: value }),
})

const system = defineSystem({ bgColor })

const configFor = (platform: 'web' | 'native' | undefined) => ({
  getTokens: () => ({}),
  useClassName: false,
  useMedia: false,
  mediaMode: false as const,
  pseudoMode: 'css' as const,
  debug: false,
  platform,
  getProps() {
    return {}
  },
  initRef: () => {},
  initInteraction: () => {},
})

// biome-ignore lint/suspicious/noExplicitAny: test reaches into instances
const styleFor = (sheet: any, platform: 'web' | 'native' | undefined): any =>
  sheet[SYMBOL_INIT](configFor(platform), {}).getCurrentStyle('root').style

describe('@platform keys', () => {
  const sheet = system.stylesheet({
    root: {
      bgColor: 'base',
      '@platform.web': { bgColor: 'accent', style: { whiteSpace: 'nowrap' } },
      '@platform.native': { bgColor: 'muted' },
    },
  })

  test('the matching platform block wins over siblings', () => {
    expect(styleFor(sheet, 'web').backgroundColor).toBe('accent')
    expect(styleFor(sheet, 'web').whiteSpace).toBe('nowrap')
  })

  test('the other platform gets its own block, none of the foreign one', () => {
    const style = styleFor(sheet, 'native')
    expect(style.backgroundColor).toBe('muted')
    expect(style.whiteSpace).toBeUndefined()
  })

  test('no platform configured drops every platform block', () => {
    const style = styleFor(sheet, undefined)
    expect(style.backgroundColor).toBe('base')
    expect(style.whiteSpace).toBeUndefined()
  })

  test('rules without platform keys keep identity (matcher sharing intact)', () => {
    const plain = { root: { bgColor: 'base' } }
    expect(resolvePlatformKeys(plain, 'web')).toBe(plain)
  })

  test('prepared grid and override layers retain identity when prepared again', () => {
    const grid = defineGrid('prepared', { columns: [fr(1)], areas: [['body']] })
    const rules = {
      root: { $grid: grid, style: { gap: 4 } },
      child: { $area: grid.area('body') },
      [RULE_LAYERS]: [{ root: { style: { gap: 8 } } }],
    }
    const prepared = resolvePlatformKeys(rules, 'web')
    expect(prepared).not.toBe(rules)
    expect(resolvePlatformKeys(prepared, 'web')).toBe(prepared)
    expect(prepared.root.style.gap).toBe(4)
    expect(prepared[RULE_LAYERS][0]!.root.style.gap).toBe(8)
    expect(() => resolvePlatformKeys(rules, 'native')).toThrow()
  })

  test('resolution is memoized per platform', () => {
    const rules = {
      root: { bgColor: 'base', '@platform.web': { bgColor: 'accent' } },
    }
    expect(resolvePlatformKeys(rules, 'web')).toBe(
      resolvePlatformKeys(rules, 'web'),
    )
    expect(resolvePlatformKeys(rules, 'web')).not.toBe(
      resolvePlatformKeys(rules, 'native'),
    )
  })
})
