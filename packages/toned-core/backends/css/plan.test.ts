import { describe, expect, it, vi } from 'vitest'

import { buildStyles } from '../../build/index.ts'
import { compilePlan, compileRules, resolvePlan } from '../../core/plan.ts'
import { createNativeRenderer, createWebRenderer } from '../../server/index.ts'
import { RULE_LAYERS } from '../../stylesheet/rule-protocol.ts'
import { StyleMatcher } from '../../stylesheet/StyleMatcher.ts'
import { defineSystem, defineToken } from '../../system/definers.ts'
import type { Variants } from '../../types/index.ts'
import { resolveCssPlan } from './plan.ts'
import { cssTestValue } from './test-values.test.helpers.ts'

const tokens = {
  gap: defineToken({
    values: [0, 4, 8, 12, 20],
    resolve: (gap: number) => ({ gap }),
  }),
  paint: defineToken({
    values: ['red', 'blue'],
    resolve: (color: string) => ({ color }),
  }),
  both: defineToken({
    values: [1, 2],
    resolve: (value: number) => ({ gap: value, opacity: value / 2 }),
  }),
}

describe('CSS shared-plan adapter', () => {
  it('prunes superseded generated parameters while retaining fallback chains and authored variables', () => {
    const system = defineSystem(tokens)
    const plan = compileRules(
      system,
      {
        Root: { gap: 4, ':hover': { gap: 8 } },
        [RULE_LAYERS]: [
          {
            Root: {
              gap: 12,
              ':hover': { gap: 20 },
              style: { '--toned-rule-authored': 'retained' },
            },
          },
        ],
      },
      'web',
    )
    const style = resolveCssPlan(plan, system, {})['Root']!.style
    expect(
      Object.keys(style).filter(
        (name) =>
          name.startsWith('--toned-rule-') && name !== '--toned-rule-authored',
      ),
    ).toHaveLength(1)
    expect(style['--toned-rule-authored']).toBe('retained')
    expect(cssTestValue(style, 'gap', { '--toned_hover': false })).toBe('12px')
    expect(cssTestValue(style, 'gap', { '--toned_hover': true })).toBe('20px')
  })

  it('keeps transitive Boolean guards shared by a surviving field and class-only alpha parameters', () => {
    const system = defineSystem(
      {
        ...tokens,
        ink: defineToken({
          values: ['red'],
          resolve: () => ({ color: '#ff0000' }),
          alphaChannel: ['color'],
        }),
      },
      { breakpoints: { __breakpoints: { md: 600 } } },
    )
    const predicate = system.q.not(
      system.q.any(system.q.media('md'), system.q.part('Root').state('hover')),
    )
    const plan = compileRules(
      system,
      {
        Root: { ink: 'red/37', style: { width: 10, opacity: 1 } },
        [predicate]: { Root: { style: { width: 20, opacity: 0.5 } } },
        [RULE_LAYERS]: [{ Root: { style: { opacity: 1 } } }],
      },
      'web',
    )
    const style = resolveCssPlan(plan, system, {})['Root']!.style
    expect(style['--toned-alpha-color']).toBe('0.37')
    expect(
      Object.keys(style).some(
        (name) => name.startsWith('--toned-rule-') && name.endsWith('-opacity'),
      ),
    ).toBe(false)
    expect(
      cssTestValue(style, 'width', {
        '--media-md-not': true,
        '--toned_hover-not': true,
      }),
    ).toBe('20px')
    expect(
      cssTestValue(style, 'width', {
        '--media-md-not': false,
        '--toned_hover-not': true,
      }),
    ).toBe('10px')
    expect(cssTestValue(style, 'opacity')).toBe(1)
  })

  it('validates direct native exec through the native output adapter', () => {
    const system = defineSystem(tokens)
    expect(
      system.exec({ tokens: {}, platform: 'native' }, { paint: 'red' }).style,
    ).toEqual({ color: 'red' })
    for (const width of ['var(--size)', '2rem'])
      expect(() =>
        system.exec({ tokens: {}, platform: 'native' }, {
          style: { width },
        } as any),
      ).toThrow()
    expect(() =>
      system.exec({ tokens: {}, platform: 'native' }, {
        style: { whiteSpace: 'nowrap' },
      } as any),
    ).toThrow()
  })

  it('preserves finite selector effects even when a token emits no own fields', () => {
    const stretch = defineToken({
      values: ['always', 'none'],
      resolve: () => ({}),
      pseudoRules: (value: string) =>
        value === 'always' ? { ' > *': { width: '100%' } } : undefined,
    })
    const system = defineSystem({ id: 'effects', tokens: { stretch } })
    const sheet = system
      .stylesheet({ Root: { stretch: 'always' } })
      .variants(($: Variants<{ off: boolean }>) => ({
        [$.off(true)]: { Root: { stretch: 'none' } },
      }))
    const artifact = buildStyles(system, { sheets: [sheet] })
    const renderer = createWebRenderer(system, {
      tokens: {},
      manifest: artifact.manifest,
    })
    expect(renderer.resolve(sheet, { variants: { off: false } }).Root).toEqual({
      className: '_ effects--stretch_always',
      style: {},
    })
    expect(
      renderer.resolve(sheet, { variants: { off: true } }).Root.className,
    ).toBe('_ effects--stretch_none')
    expect(artifact.css).toContain('.effects--stretch_always > *{width:100%;}')
    expect(() =>
      createNativeRenderer(system, { tokens: {} }).resolve(sheet, {
        variants: { off: false },
      }),
    ).toThrow('$pseudoRules')
    expect(() =>
      resolvePlan(
        compilePlan(system, sheet, 'web'),
        system,
        {},
        {},
        { evaluate: false },
      ),
    ).toThrow('$pseudoRules')
  })

  it('resolves each authored token once and never invokes the legacy executor', () => {
    const resolve = vi.fn((gap: number) => ({ gap }))
    const system = defineSystem({
      id: 'css-plan',
      tokens: { gap: defineToken({ values: [4, 8], resolve }) },
    })
    const sheet = system.stylesheet({ Root: { gap: 4, ':hover': { gap: 8 } } })
    const artifact = buildStyles(system, { sheets: [sheet] })
    const exec = vi.spyOn(system, 'exec').mockImplementation(() => {
      throw new Error('legacy executor invoked')
    })
    resolve.mockClear()
    const output = createWebRenderer(system, {
      tokens: {},
      manifest: artifact.manifest,
    }).resolve(sheet).Root
    expect(resolve).toHaveBeenCalledTimes(2)
    expect(exec).not.toHaveBeenCalled()
    expect(output.className).toContain('css-plan--gap_4')
    expect(output.style['gap']).toContain('4px')
    expect(JSON.stringify(output.style)).toContain('--css-plan-toned_hover')
  })

  it('preserves static atomic output and only inlines contested fields of composite tokens', () => {
    const system = defineSystem(tokens)
    for (const Root of [
      { gap: 4, paint: 'red' },
      { both: 1, style: { gap: 12 } },
      { style: { gap: 12 }, both: 1 },
    ]) {
      const sheet = system.stylesheet({ Root } as any)
      const matcher = new StyleMatcher({ Root })
      const old = system.exec(
        { tokens: {}, useClassName: true },
        matcher.match({})['Root'],
      )
      expect(
        resolveCssPlan(compilePlan(system, sheet, 'web'), system, {})['Root'],
      ).toEqual(old)
    }
  })

  it('retains finite responsive classes for opted legacy tokens', () => {
    const system = defineSystem(tokens, {
      breakpoints: { __breakpoints: { md: 600 } },
      responsiveTokens: ['gap'],
    })
    const sheet = system.stylesheet({ Root: { gap: 4, '@md': { gap: 8 } } })
    const output = resolveCssPlan(
      compilePlan(system, sheet, 'web'),
      system,
      {},
    )['Root']!
    expect(output.className).toBe('_ gap_4 @md:gap_8')
    expect(output.style).toEqual({})
  })

  it('honors runtime mode rather than retaining symbolic browser conditions', () => {
    const system = defineSystem(tokens, {
      breakpoints: { __breakpoints: { md: 600 } },
    })
    const sheet = system.stylesheet({
      Root: { gap: 4, '@md': { gap: 8 }, ':hover': { paint: 'blue' } },
    })
    const plan = compilePlan(system, sheet, 'web')
    const output = resolveCssPlan(
      plan,
      system,
      {},
      { '@md': true, 'Root:hover': true },
      { useClassName: false, mediaMode: 'runtime', pseudoMode: 'runtime' },
    )['Root']!
    expect(output.style).toEqual({ gap: 8, color: 'blue' })
  })

  it('keeps opaque selector/class extensions out of the portable field stream', () => {
    const system = defineSystem(tokens)
    const sheet = system.stylesheet({
      Root: { gap: 4, className: 'caller' },
    } as any)
    const plan = compilePlan(system, sheet, 'web')
    expect(plan.extensions.map((operation) => operation.token)).toEqual([
      'className',
    ])
    expect(plan.operations.map((operation) => operation.token)).toEqual(['gap'])
    expect(() => resolvePlan(plan, system, {})).toThrow('CSS extension backend')
    expect(resolveCssPlan(plan, system, {})['Root']!.className).toBe(
      '_ gap_4 caller',
    )
  })

  it('retains ancestor/sibling CSS channels without using runtime state facts', () => {
    const system = defineSystem(tokens)
    const sheet = system.stylesheet({
      Source: { gap: 4 },
      Target: { paint: 'red' },
      'Source:hover': { Target: { paint: 'blue' } },
    })
    const output = resolveCssPlan(compilePlan(system, sheet, 'web'), system, {})
    expect(output['Source']!.className).toContain('_s')
    expect(JSON.stringify(output['Target'])).toContain('--toned_src-hover')
    const sibling = system.stylesheet({
      Source: { gap: 4 },
      Target: { paint: 'red' },
      'Source~:hover': { Target: { paint: 'blue' } },
    } as any)
    expect(
      JSON.stringify(
        resolveCssPlan(compilePlan(system, sibling, 'web'), system, {})[
          'Target'
        ],
      ),
    ).toContain('--toned_sib-hover')
  })
})

it('legacy direct exec raw style wins over finite token classes in either key order', () => {
  const system = defineSystem(tokens)
  for (const input of [
    { style: { color: 'blue' }, paint: 'red' },
    { paint: 'red', style: { color: 'blue' } },
  ]) {
    const result = system.exec(
      { tokens: {}, useClassName: true },
      input as never,
    )
    expect(result.style).toMatchObject({ color: 'blue' })
  }
  // Literal resolution and new descriptor source order retain their own contracts.
  expect(
    system.exec(
      { tokens: {}, useClassName: false },
      {
        style: { color: 'blue' },
        paint: 'red',
      },
    ).style,
  ).toMatchObject({ color: 'red' })
  const descriptor = defineSystem({ id: 'ordered', tokens })
  expect(
    descriptor.exec({ tokens: {}, useClassName: true }, {
      $style: { color: 'blue' },
      paint: 'red',
    } as never).style,
  ).toMatchObject({ color: 'red' })
})

it('direct exec observes mutations to token and nested raw-style inputs', () => {
  const system = defineSystem(tokens)
  const input = { paint: 'red' as 'red' | 'blue', style: { opacity: 0.5 } }
  const before = system.exec({ tokens: {}, useClassName: false }, input)
  input.paint = 'blue'
  input.style.opacity = 1
  expect(system.exec({ tokens: {}, useClassName: false }, input).style).toEqual(
    { color: 'blue', opacity: 1 },
  )
  expect(before.style).toEqual({ color: 'red', opacity: 0.5 })
  const caller = { style: { opacity: 0.25 } }
  const retained = system.t(caller)
  expect(retained.style).toMatchObject({ opacity: 0.25 })
  caller.style.opacity = 0.75
  expect(retained.style).toMatchObject({ opacity: 0.25 })
  expect(system.t(caller).style).toMatchObject({ opacity: 0.75 })
})

it('t validates metadata immediately without reading a result getter', () => {
  const system = defineSystem(tokens)
  expect(() => system.t({ ':hover': { $kind: 'text' } } as never)).toThrow(
    'part kind is static',
  )
  expect(() => system.t({ $kind: 'view', $$type: 'text' } as never)).toThrow(
    '$kind and $$type must agree',
  )
})

it('does not mistake user part names for authored Boolean query boundaries', () => {
  const legacy = defineSystem(tokens, {
    breakpoints: { __breakpoints: { md: 600 } },
  })
  const styles = ['Root', 'query', 'when'].map((part) => {
    const plan = compileRules(
      legacy,
      {
        [part]: { gap: 0, ':hover': { gap: 4 }, '@md': { gap: 8 } },
      },
      'web',
    )
    expect(
      plan.operations.every(
        (operation) => operation.origin.query === undefined,
      ),
    ).toBe(true)
    return resolveCssPlan(plan, legacy, {})[part]!.style
  })
  for (const media of [false, true])
    for (const hover of [false, true]) {
      const guards = { '--media-md': media, '--toned_hover': hover }
      const expected = cssTestValue(styles[0]!, 'gap', guards)
      for (const style of styles.slice(1))
        expect(cssTestValue(style, 'gap', guards)).toBe(expected)
    }
})

describe('legacy cascade ranking', () => {
  const legacy = () =>
    defineSystem(tokens, {
      states: { busy: '[aria-busy=true]', open: '[data-open]' },
      breakpoints: { __breakpoints: { md: 600, lg: 900 } },
      containers: { card: { s: 200, l: 400 }, rail: { s: 100 } },
    } as never)
  const rules = {
    Root: {
      gap: 4,
      style: { opacity: 1 },
      ':open': { gap: 8 },
      ':hover': { gap: 12, paint: 'red' },
      ':busy': { gap: 20 },
      '@lg': { gap: 12 },
      '@md': { gap: 8 },
      '@card/l': { paint: 'blue' },
      '@rail/s': { paint: 'red' },
      '@card/s': { gap: 0 },
    },
  }

  it('orders a layer by the fixed media, container and state ladder', () => {
    const system = legacy()
    const plan = compileRules(system, rules, 'web')
    const resolved = resolveCssPlan(plan, system, {}, {}, { part: 'Root' })
    expect(resolved).toMatchInlineSnapshot(`
      {
        "Root": {
          "className": "_ gap_4",
          "style": {
            "--toned-rule-10-gap": "var(--cq-card-s) 0px",
            "--toned-rule-2-gap": "var(--toned_open) 8px",
            "--toned-rule-3-gap": "var(--toned_hover) 12px",
            "--toned-rule-4-color": "var(--toned_hover) red",
            "--toned-rule-5-gap": "var(--toned_busy) 20px",
            "--toned-rule-6-gap": "var(--media-lg) 12px",
            "--toned-rule-7-gap": "var(--media-md) 8px",
            "--toned-rule-8-color": "var(--cq-card-l) blue",
            "--toned-rule-9-color": "var(--cq-rail-s) red",
            "color": "var(--toned-rule-4-color, var(--toned-rule-9-color, var(--toned-rule-8-color, revert-layer)))",
            "gap": "var(--toned-rule-2-gap, var(--toned-rule-5-gap, var(--toned-rule-3-gap, var(--toned-rule-10-gap, var(--toned-rule-6-gap, var(--toned-rule-7-gap, 4px))))))",
            "opacity": 1,
          },
        },
      }
    `)
  })

  it('derives the ladder once per system, not per resolve or comparison', () => {
    const system = legacy()
    const plan = compileRules(system, rules, 'web')
    const config = system.system as {
      states: object
      containers: object
    }
    const first = resolveCssPlan(plan, system, {}, {}, { part: 'Root' })
    const keys = vi.spyOn(Object, 'keys')
    try {
      for (let i = 0; i < 10; i++)
        expect(resolveCssPlan(plan, system, {}, {}, { part: 'Root' })).toEqual(
          first,
        )
      const ladderReads = keys.mock.calls.filter(
        ([value]) => value === config.states || value === config.containers,
      ).length
      expect(ladderReads).toBe(0)
    } finally {
      keys.mockRestore()
    }
  })
})
