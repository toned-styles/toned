import { describe, expect, test } from 'vitest'
import { and, bp, cq, not, or } from '../system/conditions.ts'
import {
  atomToggleVar,
  clauseGuard,
  clauseSlug,
  collectAdHocConditions,
  evalExpr,
  parseConditionKey,
  serializeExpr,
} from './conditions.ts'

describe('condition grammar', () => {
  test('parses the three atom shapes and round-trips', () => {
    for (const key of [
      'md',
      'field-group/md',
      'card/>=25rem',
      '!card/>=400',
      'md&card/>=30rem',
      'card/<ignored-no',
    ]) {
      const expr = parseConditionKey(key)
      if (key === 'card/<ignored-no') {
        // `<` is not grammar — width < X is spelled `!name/>=X`
        expect(expr?.[0]?.[0]?.step).toBe('<ignored-no')
        continue
      }
      expect(expr).not.toBeNull()
      expect(serializeExpr(expr!)).toBe(key)
    }
  })

  test('platform keys are NOT conditions', () => {
    expect(parseConditionKey('platform.web')).toBeNull()
  })

  test('slugs and toggle vars match the generated names', () => {
    const simple = parseConditionKey('field-group/md')![0]![0]!
    expect(atomToggleVar(simple)).toBe('--cq-field-group-md')
    const adhoc = parseConditionKey('card/>=22.5rem')![0]![0]!
    expect(atomToggleVar(adhoc)).toBe('--cq-card-gte22p5rem')
    const negated = parseConditionKey('!md')![0]![0]!
    expect(atomToggleVar(negated)).toBe('--media-md-not')
  })

  test('clause slug and guard compose the product', () => {
    const clause = parseConditionKey('md&!card/>=400')![0]!
    expect(clauseSlug(clause)).toBe('media-md-and-not-cq-card-gte400')
    expect(clauseGuard(clause)).toBe('var(--media-md) var(--cq-card-gte400-not)')
  })
})

describe('runtime evaluation', () => {
  // Numbers ride the base scale: sm=80 units and >=100 are 320px / 400px.
  const env = (cardPx: number | undefined, md: boolean | undefined) => ({
    media: () => md,
    containerPx: () => cardPx,
    stepWidth: (_c: string, s: string) => (s === 'sm' ? 80 : undefined),
    basePx: 4,
  })

  test('an unmeasured container acts as width 0 — before negation', () => {
    const below = parseConditionKey('!card/>=100')!
    expect(evalExpr(below, env(undefined, undefined))).toBe(true)
    expect(evalExpr(below, env(200, undefined))).toBe(true)
    expect(evalExpr(below, env(400, undefined))).toBe(false)
  })

  test('AND, OR and mixed media atoms', () => {
    const mixed = parseConditionKey('md&card/>=100')!
    expect(evalExpr(mixed, env(500, true))).toBe(true)
    expect(evalExpr(mixed, env(500, false))).toBe(false)
    expect(evalExpr(mixed, env(300, true))).toBe(false)
    const either = parseConditionKey('md|card/sm')!
    expect(evalExpr(either, env(350, false))).toBe(true)
    expect(evalExpr(either, env(100, false))).toBe(false)
  })
})

describe('builders serialize to canonical keys', () => {
  test('atoms', () => {
    expect(String(bp('md'))).toBe('@md')
    expect(String(cq('field-group').step('md'))).toBe('@field-group/md')
    expect(String(cq('card').min('25rem'))).toBe('@card/>=25rem')
    expect(String(cq('card').min(400))).toBe('@card/>=400')
    // width < X is not(min X) — the whole comparison surface is min + algebra
    expect(String(cq('card').below(400))).toBe('@!card/>=400')
  })

  test('algebra normalizes to DNF', () => {
    expect(String(not(cq('card').min(400)))).toBe('@!card/>=400')
    expect(String(and(bp('md'), cq('card').min('30rem')))).toBe(
      '@md&card/>=30rem',
    )
    expect(String(or(bp('md'), cq('card').min(400)))).toBe('@md|card/>=400')
    // De Morgan: not(a or b) = !a & !b
    expect(String(not(or(bp('md'), cq('card').min(400))))).toBe(
      '@!md&!card/>=400',
    )
    // not(a and b) = !a | !b
    expect(String(not(and(bp('md'), cq('card').min(400))))).toBe(
      '@!md|!card/>=400',
    )
    // and distributes over or
    expect(String(and(bp('md'), or(cq('a').min(1), cq('b').min(2))))).toBe(
      '@md&a/>=1|md&b/>=2',
    )
  })

  test('a builder key works as a computed object key', () => {
    const rules = { [cq('card').min('25rem') as unknown as string]: { gap: 2 } }
    expect(Object.keys(rules)).toEqual(['@card/>=25rem'])
  })
})

describe('ad-hoc registration walk', () => {
  test('collects ad-hoc atoms from every level, positive spelling only', () => {
    const out = new Set<string>()
    collectAdHocConditions(
      {
        Root: {
          '@card/>=25rem': { gap: 2 },
          '@!card/>=400': { gap: 1 },
          '@md': { gap: 3 },
          '@field-group/md': { gap: 4 },
        },
        '@md&card/>=30rem': { Root: { gap: 5 } },
        '[variant=x]': { Root: { '@card/>=612': { gap: 6 } } },
        '@platform.web': { Root: { gap: 0 } },
      },
      out,
    )
    expect([...out].sort()).toEqual([
      'card/>=25rem',
      'card/>=30rem',
      'card/>=400',
      'card/>=612',
    ])
  })
})
