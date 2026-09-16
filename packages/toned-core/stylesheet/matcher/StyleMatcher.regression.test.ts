import { describe, expect, test } from 'vitest'
import { defineSystem, defineToken } from '../../system/definers.ts'
import { StyleMatcher } from '../StyleMatcher.ts'
import { RULE_LAYERS, TOKEN_OPERATIONS, WHEN_RULES } from './normalizeRules.ts'

describe('collision-free matcher plans', () => {
  for (const count of [31, 32, 33, 63, 64, 65]) {
    test(`${count} values on one axis select independently, including bit 31`, () => {
      const rules = Object.fromEntries(
        Array.from({ length: count }, (_, value) => [
          `[mode=v${value}]`,
          { Root: { value } },
        ]),
      )
      const matcher = new StyleMatcher(rules)
      for (let value = 0; value < count; value++) {
        expect(matcher.match({ mode: `v${value}` }).Root).toEqual({ value })
      }
      expect(matcher.match({ mode: 'unknown' }).Root).toEqual({})
      expect(matcher.cache.size).toBe(count + 1)
      expect(
        matcher.isEqual(
          'Root',
          matcher.match({ mode: 'v0' }),
          matcher.match({ mode: `v${count - 1}` }),
        ),
      ).toBe(false)
    })
  }

  test('different words participate in the complete state cache key', () => {
    const rules: Record<string, object> = { Root: { value: -1 } }
    for (let index = 0; index < 65; index++)
      rules[`[axis${index}]`] = { Root: { [`v${index}`]: index } }
    const matcher = new StyleMatcher(rules)
    const low = matcher.match({ axis0: true })
    const high = matcher.match({ axis32: true })
    const highest = matcher.match({ axis64: true })
    expect(low.Root).toEqual({ value: -1, v0: 0 })
    expect(high.Root).toEqual({ value: -1, v32: 32 })
    expect(highest.Root).toEqual({ value: -1, v64: 64 })
    expect(matcher.match({ axis32: true })).toBe(high)
  })

  test('combined rules cannot cancel their constituent membership', () => {
    const matcher = new StyleMatcher({
      Root: { color: 'base' },
      '[a]': { Root: { color: 'a' } },
      '[b]': { Root: { color: 'b' } },
      '[a][b]': { Root: { color: 'ab' } },
      '[c]': { Root: { padding: 1 } },
    })
    const c = matcher.match({ c: true })
    const abc = matcher.match({ a: true, b: true, c: true })
    expect(c.Root.color).toBe('base')
    expect(abc.Root.color).toBe('ab')
    expect(matcher.isEqual('Root', c, abc)).toBe(false)
    expect(
      matcher.isEqual(
        'Root',
        abc,
        matcher.match({ a: true, b: true, c: true }),
      ),
    ).toBe(true)
    expect(matcher.isEqual('Root', undefined, c)).toBe(false)
  })

  test('equal membership in different immutable plans is not equal output', () => {
    const before = new StyleMatcher({ Root: { value: 'before' } })
    const after = new StyleMatcher({ Root: { value: 'after' } })
    expect(before.isEqual('Root', before.match({}), after.match({}))).toBe(
      false,
    )
  })

  test('cacheMax zero disables caching', () => {
    const matcher = new StyleMatcher({ Root: { value: 1 } }, { cacheMax: 0 })
    expect(matcher.match({})).not.toBe(matcher.match({}))
    expect(matcher.cache.size).toBe(0)
  })
})

describe('normalized rule occurrences', () => {
  test('sibling selectors in override layers lower against existing sheet parts', () => {
    const matcher = new StyleMatcher(
      {
        Group: {},
        Label: { color: 'base' },
        [RULE_LAYERS]: [{ 'Group~:visible': { Label: { color: 'visible' } } }],
      },
      { cssPseudoMode: true, stateAliases: ['visible'] },
    )
    expect([...matcher.elementSet]).toEqual(['Group', 'Label'])
    expect(matcher.match({}).Group.className).toBe('_s')
    expect(matcher.match({}).Label[':sib-visible_color']).toBe('visible')
    expect(matcher.interactions).toEqual({})
  })

  test('dictionary-like part names never mutate object prototypes', () => {
    const previous = Object.getOwnPropertyDescriptor(Object.prototype, 'color')
    const matcher = new StyleMatcher({
      ['__proto__']: { color: 'safe' },
      '[active]': { ['__proto__']: { color: 'active' } },
    })
    expect(Object.hasOwn(matcher.match({}), '__proto__')).toBe(true)
    expect(matcher.match({ active: true })['__proto__']).toEqual({
      color: 'active',
    })
    expect(Object.getOwnPropertyDescriptor(Object.prototype, 'color')).toEqual(
      previous,
    )
  })

  test('override layer defaults beat earlier variants and layer conditions specialize their defaults', () => {
    const matcher = new StyleMatcher({
      Root: { color: 'base' },
      '[active]': { Root: { color: 'base-active' } },
      [RULE_LAYERS]: [
        {
          '[active]': { Root: { padding: 2 } },
          Root: { color: 'override', padding: 1 },
        },
        { '[focused]': { Root: { color: 'instance-focused' } } },
      ],
    })
    expect(matcher.match({ active: true }).Root).toEqual({
      color: 'override',
      padding: 2,
    })
    expect(matcher.match({ active: true, focused: true }).Root).toEqual({
      color: 'instance-focused',
      padding: 2,
    })
    expect(matcher.match({}).Root).toEqual({ color: 'override', padding: 1 })
  })

  test('every declared part has an empty result when none of its fields match', () => {
    const matcher = new StyleMatcher({
      Root: {},
      Label: { ':hover': { color: 'red' } },
    })
    expect(matcher.match({}).Root).toEqual({})
    expect(matcher.match({}).Label).toEqual({})
  })

  test('later overlapping tokens move after earlier tokens and preserve raw fragments', () => {
    const matcher = new StyleMatcher({
      Root: {
        style: { color: 'red', margin: 1 },
        first: 'base',
        second: 'blue',
      },
      '[active]': { Root: { first: 'active', style: { margin: 2 } } },
    })
    const result = matcher.match({ active: true }).Root
    expect(Object.keys(result)).toEqual(['second', 'first', 'style'])
    expect(result[TOKEN_OPERATIONS]).toEqual([
      { key: 'style', value: { color: 'red', margin: 1 }, layer: 0 },
      { key: 'first', value: 'base', layer: 0 },
      { key: 'second', value: 'blue', layer: 0 },
      { key: 'first', value: 'active', layer: 0 },
      { key: 'style', value: { margin: 2 }, layer: 0 },
    ])
  })

  test('resolved CSS fields follow token occurrence order without raising old raw-style fields', () => {
    const system = defineSystem({
      first: defineToken({
        values: ['base', 'active'],
        resolve: (value) => ({
          color: value === 'base' ? 'red' : 'green',
          paddingTop: 8,
        }),
      }),
      second: defineToken({
        values: ['blue'],
        resolve: () => ({ color: 'blue' }),
      }),
    })
    const tokens = new StyleMatcher({
      Root: { first: 'base', second: 'blue' },
      '[active]': { Root: { first: 'active' } },
    })
    expect(
      system.exec(
        { tokens: {}, useClassName: false },
        tokens.match({ active: true }).Root,
      ).style,
    ).toMatchObject({ color: 'green', paddingTop: 8 })
    const raw = new StyleMatcher({
      Root: { style: { color: 'red', margin: 1 }, second: 'blue' },
      '[active]': { Root: { style: { margin: 2 } } },
    })
    expect(
      system.exec(
        { tokens: {}, useClassName: false },
        raw.match({ active: true }).Root,
      ).style,
    ).toMatchObject({ color: 'blue', margin: 2 })
  })

  test('higher-layer static fields beat lower CSS predicates in legacy and explicit systems', () => {
    const paint = defineToken({
      values: ['base', 'hover', 'override'],
      resolve: (value) => ({ color: String(value) }),
    })
    const systems = [
      defineSystem({ paint }),
      defineSystem({ id: 'layers', tokens: { paint } }),
    ]
    for (const system of systems) {
      const matcher = new StyleMatcher(
        {
          Root: { paint: 'base', ':hover': { paint: 'hover' } },
          [RULE_LAYERS]: [{ Root: { paint: 'override' } }],
        },
        { cssPseudoMode: true },
      )
      expect(
        system.exec({ tokens: {}, useClassName: false }, matcher.match({}).Root)
          .style,
      ).toMatchObject({ color: 'override' })
    }
  })
  test('compound selectors have no implicit priority over later subsets', () => {
    const compound = { Root: { color: 'compound' } }
    const subset = { Root: { color: 'subset' } }
    expect(
      new StyleMatcher({
        '[size=s][variant=accent]': compound,
        '[variant=accent]': subset,
      }).match({ size: 's', variant: 'accent' }).Root.color,
    ).toBe('subset')
    expect(
      new StyleMatcher({
        '[variant=accent]': subset,
        '[size=s][variant=accent]': compound,
      }).match({ size: 's', variant: 'accent' }).Root.color,
    ).toBe('compound')
  })

  test('equivalent predicate occurrences preserve fields and source order', () => {
    const matcher = new StyleMatcher({
      '[a][b]': { Root: { color: 'first', margin: 1 } },
      '[c]': { Root: { color: 'middle' } },
      '[b][a]': { Root: { color: 'last', padding: 2 } },
    })
    expect(matcher.match({ a: true, b: true, c: true }).Root).toEqual({
      color: 'last',
      margin: 1,
      padding: 2,
    })
  })

  test('descriptor source order also applies to fields around nested conditional blocks', () => {
    const matcher = new StyleMatcher(
      {
        '[active]': { Root: { ':hover': { color: 'nested' }, color: 'later' } },
      },
      { sourceOrder: true },
    )
    expect(matcher.match({ active: true, 'Root:hover': true }).Root.color).toBe(
      'later',
    )
  })

  test('combined selectors inside parts require every axis', () => {
    const matcher = new StyleMatcher({ Root: { '[a][b]': { value: 'both' } } })
    expect(matcher.match({ a: true }).Root).toEqual({})
    expect(matcher.match({ a: true, b: true }).Root.value).toBe('both')
  })

  test('runtime local compound states require each individual interaction fact', () => {
    const matcher = new StyleMatcher({
      Root: { ':hover:focus': { color: 'both' } },
    })
    expect(matcher.interactions['Root']).toEqual({
      ':hover': true,
      ':focus': true,
    })
    expect(matcher.match({ 'Root:hover': true }).Root).toEqual({})
    expect(
      matcher.match({ 'Root:hover': true, 'Root:focus': true }).Root.color,
    ).toBe('both')
  })

  test('OR values may span words, and nested constraints intersect', () => {
    const rules: Record<string, object> = {}
    for (let index = 0; index < 65; index++)
      rules[`[mode=v${index}]`] = { Root: { index } }
    rules['[mode=v0][mode=v64]'] = {
      Root: { selected: true },
      '[mode=v64]': { Root: { nested: true } },
    }
    const matcher = new StyleMatcher(rules)
    expect(matcher.match({ mode: 'v0' }).Root).toEqual({
      index: 0,
      selected: true,
    })
    expect(matcher.match({ mode: 'v64' }).Root).toEqual({
      index: 64,
      selected: true,
      nested: true,
    })
    expect(matcher.match({ mode: 'v32' }).Root).toEqual({ index: 32 })
  })

  test('contradictory nested selections never match', () => {
    const matcher = new StyleMatcher({
      '[mode=a]': { '[mode=b]': { Root: { value: 1 } } },
    })
    expect(matcher.match({ mode: 'a' }).Root).toEqual({})
    expect(matcher.match({ mode: 'b' }).Root).toEqual({})
  })

  test('wildcard rules specialize base regardless of their position', () => {
    const matcher = new StyleMatcher({
      '[mode=*]': { Root: { value: 'wildcard' } },
      Root: { value: 'base' },
    })
    expect(matcher.match({}).Root.value).toBe('wildcard')
  })

  test('delimiter-bearing values and conditions retain exact identity', () => {
    const matcher = new StyleMatcher({
      '[mode=a=b|c%]': { Root: { value: 1 } },
      '@field/>=400|wide': { Root: { width: 400 } },
    })
    expect(
      matcher.match({ mode: 'a=b|c%', '@field/>=400|wide': true }).Root,
    ).toEqual({ value: 1, width: 400 })
    expect(matcher.match({}).Root).toEqual({})
  })

  test('exhaustive four-axis results agree with an independent ordered evaluator', () => {
    const clauses = [
      { values: { a: true }, field: 'color', value: 'a' },
      { values: { b: true, c: true }, field: 'color', value: 'bc' },
      {
        values: { a: true, b: true, c: true, d: true },
        field: 'padding',
        value: 4,
      },
      { values: { d: true }, field: 'color', value: 'd' },
      { values: { a: true, c: true }, field: 'padding', value: 2 },
    ]
    const matcher = new StyleMatcher(
      Object.fromEntries(
        clauses.map((clause) => [
          Object.keys(clause.values)
            .map((key) => `[${key}]`)
            .join(''),
          { Root: { [clause.field]: clause.value } },
        ]),
      ),
    )
    for (let state = 0; state < 16; state++) {
      const props = Object.fromEntries(
        ['a', 'b', 'c', 'd'].map((key, bit) => [
          key,
          Boolean(state & (1 << bit)),
        ]),
      )
      const expected: Record<string, string | number> = {}
      for (const clause of clauses) {
        if (Object.keys(clause.values).every((key) => props[key]))
          expected[clause.field] = clause.value
      }
      expect(matcher.match(props).Root ?? {}).toEqual(expected)
    }
  })
})

describe('legacy runtime condition precedence', () => {
  for (const [query, fact] of [
    [':hover', 'Root:hover'],
    ['@md', '@md'],
  ] as const) {
    for (const sourceOrder of [false, true]) {
      test(`${query} specializes later sibling defaults only in legacy mode (sourceOrder=${sourceOrder})`, () => {
        const rules = {
          Root: {},
          Label: {},
          '[variant=accent]': {
            Root: {
              [query]: {
                $Root: { paint: 'active' },
                $Label: { paint: 'active-label' },
              },
            },
            Label: { paint: 'default-label' },
          },
        }
        const active: {
          variant: 'accent'
          'Root:hover'?: boolean
          '@md'?: boolean
        } = {
          variant: 'accent',
          [fact]: true,
        }
        const matcher = new StyleMatcher(rules, { sourceOrder })
        expect(matcher.match({ variant: 'accent' }).Label.paint).toBe(
          'default-label',
        )
        expect(matcher.match(active).Root.paint).toBe('active')
        expect(matcher.match(active).Label.paint).toBe(
          sourceOrder ? 'default-label' : 'active-label',
        )
        expect(matcher.match({ [fact]: true }).Label.paint).toBeUndefined()

        const override = new StyleMatcher(
          {
            ...rules,
            [RULE_LAYERS]: [{ Label: { paint: 'override' } }],
          },
          { sourceOrder },
        )
        expect(override.match(active).Label.paint).toBe('override')

        const guarded = new StyleMatcher(
          {
            ...rules,
            [WHEN_RULES]: [
              {
                predicate: { op: 'atom', key: '[emphasis]' },
                rules: { Label: { paint: 'guarded' } },
              },
            ],
          },
          { sourceOrder },
        )
        expect(guarded.match({ ...active, emphasis: true }).Label.paint).toBe(
          'guarded',
        )
      })
    }
  }
})
