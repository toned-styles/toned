import { expect, test } from 'vitest'
import { cssTestValue } from '../backends/css/test-values.test.helpers.ts'
import { generate } from '../dom/generate.ts'
import { WHEN_RULES } from '../stylesheet/matcher/normalizeRules.ts'
import { StyleMatcher } from '../stylesheet/StyleMatcher.ts'
import { serializeCssValue } from '../utils/css-value.ts'
import { defineSystem, defineToken } from './definers.ts'

const raw = { width: 2, padding: 4, opacity: 0.5, lineHeight: 1.25 }
const base = { width: 1, padding: 0, opacity: 1, lineHeight: 1 }
const numeric = defineToken({
  values: ['small'],
  resolve: () => ({ ...raw, height: '2rem', '--ratio': 2 }),
})
const system = defineSystem(
  { numeric },
  { breakpoints: { __breakpoints: { md: 768 } } },
)

test('CSS serialization is field-aware and accepts camel and kebab names', () => {
  expect(serializeCssValue('width', 2)).toBe('2px')
  expect(serializeCssValue('padding', 0)).toBe('0px')
  expect(serializeCssValue('line-height', 1.25)).toBe('1.25')
  expect(serializeCssValue('lineHeight', 1.25)).toBe('1.25')
  expect(serializeCssValue('WebkitLineClamp', 2)).toBe('2')
  expect(serializeCssValue('--ratio', 2)).toBe('2')
  expect(serializeCssValue('width', '2rem')).toBe('2rem')
})

for (const condition of [':hover', '@md'])
  for (const tokens of [false, true])
    test(`${condition} serializes ${tokens ? 'token' : '$style'} values and fallback dimensions`, () => {
      const declaration = {
        $style: base,
        [condition]: tokens ? { numeric: 'small' } : { $style: raw },
      }
      const output = system.exec(
        { tokens: {}, useClassName: false },
        declaration as any,
      ).style as Record<string, unknown>
      const toggle = condition === ':hover' ? '--toned_hover' : '--media-md'
      for (const [field, inactive, active] of [
        ['width', '1px', '2px'],
        ['padding', '0px', '4px'],
        ['opacity', '1', '0.5'],
        ['lineHeight', '1', '1.25'],
      ]) {
        expect(cssTestValue(output, field!, { [toggle]: false })).toBe(inactive)
        expect(cssTestValue(output, field!, { [toggle]: true })).toBe(active)
      }
    })

test('advanced .when serializes portable raw fields without changing native resolver values', () => {
  const rules = {
    Root: { $style: base },
    [WHEN_RULES]: [
      {
        predicate: system.q.all(system.q.part('Root').state('hover')),
        rules: { Root: { $style: raw } },
      },
    ],
  }
  const matcher = new StyleMatcher(rules, { cssPseudoMode: true })
  const output = system.exec({ tokens: {} }, matcher.match({}).Root)
    .style as Record<string, unknown>
  for (const [field, inactive, active] of [
    ['width', '1px', '2px'],
    ['padding', '0px', '4px'],
    ['opacity', '1', '0.5'],
    ['lineHeight', '1', '1.25'],
  ]) {
    expect(cssTestValue(output, field!, { '--toned_hover': false })).toBe(
      inactive,
    )
    expect(cssTestValue(output, field!, { '--toned_hover': true })).toBe(active)
  }
  const runtime = new StyleMatcher(rules, { platform: 'native' })
  expect(
    system.exec(
      { tokens: {}, platform: 'native' },
      runtime.match({ 'Root:hover': true }).Root,
    ).style,
  ).toMatchObject(raw)
})

test('atomic, responsive, pseudo-element and animation output serialize the same fields', () => {
  const css = generate({
    numeric: {
      ...numeric,
      pseudoRules: () => ({ '::before': { width: 2, lineHeight: 1.25 } }),
    },
    responsiveTokens: ['numeric'],
    breakpoints: { __breakpoints: { md: 768 } },
    animations: {
      grow: { from: { width: 2, opacity: 0 }, to: { width: 4, opacity: 1 } },
    },
  })
  expect(css).toContain(
    '.numeric_small{width:2px;padding:4px;opacity:0.5;line-height:1.25;height:2rem;--ratio:2;}',
  )
  expect(css).toContain('numeric_small::before{width:2px;line-height:1.25;}')
  expect(css).toContain(
    'numeric_small{width:2px;padding:4px;opacity:0.5;line-height:1.25;height:2rem;--ratio:2;}}',
  )
  expect(css).toContain(
    '@keyframes toned_grow {from {width:2px;opacity:0;}to {width:4px;opacity:1;}}',
  )
})

test('a guarded token with an opaque selector effect fails explicitly instead of discarding the effect', () => {
  const effect = defineToken({
    values: ['small'],
    resolve: () => raw,
    pseudoRules: () => ({ '::before': { width: 2, lineHeight: 1.25 } }),
  })
  const ui = defineSystem(
    { effect },
    { breakpoints: { __breakpoints: { md: 768 } } },
  )
  for (const condition of [':hover', '@md'])
    expect(() =>
      ui.exec({ tokens: {}, useClassName: false }, {
        [condition]: { effect: 'small' },
      } as any),
    ).toThrow('$pseudoRules cannot be conditional')
})
