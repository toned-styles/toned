import { describe, expect, it, vi } from 'vitest'
import { buildStyles } from '../../build/index.ts'
import { compilePlan, compileRules, resolvePlan } from '../../core/plan.ts'
import { createNativeRenderer, createWebRenderer } from '../../server/index.ts'
import { RULE_LAYERS, WHEN_RULES } from '../../stylesheet/rule-protocol.ts'
import { StyleMatcher } from '../../stylesheet/StyleMatcher.ts'
import { defineSystem, defineToken } from '../../system/definers.ts'
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
        [WHEN_RULES]: [
          {
            predicate,
            rules: { Root: { style: { width: 20, opacity: 0.5 } } },
          },
        ],
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
      .variants<{ off: boolean }>()(($) => ({
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
  expect(system.t(caller).style).toMatchObject({ opacity: 0.25 })
  caller.style.opacity = 0.75
  expect(system.t(caller).style).toMatchObject({ opacity: 0.75 })
})
