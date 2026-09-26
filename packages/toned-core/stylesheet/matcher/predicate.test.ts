import { describe, expect, test } from 'vitest'
import { createQueries, type QueryPredicate } from '../../system/queries.ts'
import { queryExpression } from '../../system/query-key.ts'
import { createVariantSelector } from '../variantSelector.ts'
import { StyleMatcher } from '../StyleMatcher.ts'
import { CONDITIONAL_RULES, type ConditionalRule } from './normalizeRules.ts'

const q = createQueries<
  { breakpoints: { __breakpoints: { md: 768; lg: 1024 } } },
  'Root' | 'Label'
>()
const $ = createVariantSelector<{
  a: boolean
  b: boolean
  c: boolean
  d: boolean
  active: boolean
}>()
const atom = (key: string): QueryPredicate => ({ op: 'atom', key })

describe('compiled boolean predicates', () => {
  test('all/any/not runtime facts agree with the truth table without DNF expansion', () => {
    const predicate = q.all(
      q.any($.a(true), $.b(true)),
      q.not(q.all($.c(true), $.d(true))),
    )
    const matcher = new StyleMatcher({
      Root: { value: 'base' },
      [predicate]: { Root: { value: 'conditional' } },
    })
    for (let state = 0; state < 16; state++) {
      const a = Boolean(state & 1),
        b = Boolean(state & 2),
        c = Boolean(state & 4),
        d = Boolean(state & 8)
      expect(matcher.match({ a, b, c, d }).Root.value).toBe(
        (a || b) && !(c && d) ? 'conditional' : 'base',
      )
    }
  })

  test('native platform predicates resolve against the selected host', () => {
    const rules = {
      Root: { value: 'base' },
      [q.all(q.platform('native'), $.active(true))]: {
        Root: { value: 'native' },
      },
    }
    expect(
      new StyleMatcher(rules, { platform: 'native' }).match({ active: true })
        .Root.value,
    ).toBe('native')
    expect(
      new StyleMatcher(rules, { platform: 'web' }).match({ active: true }).Root
        .value,
    ).toBe('base')
  })

  test('native media and crosspart state feed the same compiled predicate', () => {
    const matcher = new StyleMatcher(
      {
        Root: {},
        Label: { value: 0 },
        [q.all(q.media('md'), q.part('Root').state('hover'))]: {
          Label: { value: 1 },
        },
      },
      { platform: 'native' },
    )
    expect(matcher.interactions['Root']).toEqual({ ':hover': true })
    expect(matcher.match({ '@md': true }).Label.value).toBe(0)
    expect(matcher.match({ '@md': true, 'Root:hover': true }).Label.value).toBe(
      1,
    )
  })

  test('CSS mode partially evaluates variants and retains self/media boolean structure', () => {
    const matcher = new StyleMatcher(
      {
        Root: { value: 'base' },
        [q.all(
          $.active(true),
          q.any(q.media('md'), q.not(q.part('Root').state('hover'))),
        )]: { Root: { value: 'conditional' } },
      },
      { cssMediaMode: true, cssPseudoMode: true },
    )
    expect(matcher.match({}).Root[CONDITIONAL_RULES]).toBeUndefined()
    const records: ConditionalRule[] = matcher.match({ active: true }).Root[
      CONDITIONAL_RULES
    ]
    expect(records).toHaveLength(1)
    expect(records[0]?.predicate).toEqual(
      queryExpression(
        q.any(q.media('md'), q.not(q.part('Root').state('hover'))),
      ),
    )
    expect(records[0]?.style).toEqual({ value: 'conditional' })
    expect(matcher.scheme).not.toHaveProperty('@md')
  })

  test('CSS mode uses exact controller facts for a different named source part', () => {
    const matcher = new StyleMatcher(
      {
        Root: {},
        Label: { value: 0 },
        [q.all(q.media('md'), q.part('Root').state('hover'))]: {
          Label: { value: 1 },
        },
      },
      { cssMediaMode: true, cssPseudoMode: true },
    )
    expect(matcher.match({}).Label[CONDITIONAL_RULES]).toBeUndefined()
    expect(
      matcher.match({ 'Root:hover': true }).Label[CONDITIONAL_RULES][0]
        .predicate,
    ).toEqual(atom('@md'))
    expect(matcher.interactions['Root']).toEqual({ ':hover': true })
  })

  test('changed residual CSS predicates invalidate equality even with the same rule membership', () => {
    const matcher = new StyleMatcher(
      {
        Root: {},
        Label: {},
        [q.any(q.media('md'), q.part('Root').state('hover'))]: {
          Label: { value: 1 },
        },
      },
      { cssMediaMode: true, cssPseudoMode: true },
    )
    expect(
      matcher.isEqual(
        'Label',
        matcher.match({}),
        matcher.match({ 'Root:hover': true }),
      ),
    ).toBe(false)
  })

  test('later unconditional advanced entries stay ordered after browser predicates', () => {
    const matcher = new StyleMatcher(
      {
        Root: { value: 'base' },
        [q.all(q.media('md'))]: { Root: { value: 'media' } },
        [q.all()]: { Root: { value: 'last' } },
      },
      { cssMediaMode: true },
    )
    const records: ConditionalRule[] = matcher.match({}).Root[CONDITIONAL_RULES]
    expect(records.map((record) => record.style['value'])).toEqual([
      'media',
      'last',
    ])
    expect(records[1]?.predicate).toEqual({ op: 'all', operands: [] })
  })

  test('rejects ambiguous local state and unknown part atoms at construction', () => {
    expect(
      () =>
        new StyleMatcher({
          Root: {},
          [q.all(q.state('hover'))]: { Root: { value: 1 } },
        }),
    ).toThrow('needs q.part')
    expect(
      () =>
        new StyleMatcher({
          Root: {},
          [q.all('Missing:hover' as never)]: { Root: { value: 1 } },
        }),
    ).toThrow('Unknown query part/state')
  })
})

test('large indexed plans retain and distinguish residual browser predicates', () => {
  const matcher = new StyleMatcher(
    {
      Root: {},
      Label: {},
      ...Object.fromEntries(
        Array.from({ length: 65 }, (_, index) => [
          `[axis${index}]`,
          { Root: { selected: index } },
        ]),
      ),
      [q.any(q.media('md'), q.part('Root').state('hover'))]: {
        Label: { value: 1 },
      },
    },
    { cssMediaMode: true, cssPseudoMode: true },
  )
  const resting = matcher.match({ axis64: true })
  const hovered = matcher.match({ axis64: true, 'Root:hover': true })
  expect(resting.Root.selected).toBe(64)
  expect(resting.Label[CONDITIONAL_RULES][0].predicate).toEqual(atom('@md'))
  expect(hovered.Label[CONDITIONAL_RULES][0].predicate).toEqual(
    queryExpression(q.all()),
  )
  expect(matcher.isEqual('Label', resting, hovered)).toBe(false)
})
