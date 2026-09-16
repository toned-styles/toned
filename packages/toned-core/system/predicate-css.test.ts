import { expect, test } from 'vitest'
import { cssTestValue } from '../backends/css/test-values.test.helpers.ts'
import { generate } from '../dom/generate.ts'
import {
  RULE_LAYERS,
  WHEN_RULES,
} from '../stylesheet/matcher/normalizeRules.ts'
import { StyleMatcher } from '../stylesheet/StyleMatcher.ts'
import { defineSystem, defineToken } from './definers.ts'
import { namespaceCss } from './namespace.ts'
import { CONDITIONAL_RULES, compilePredicateGuard } from './predicate-css.ts'

const system = defineSystem(
  {
    paint: defineToken({
      values: ['base', 'zero'],
      resolve: (value) => ({ opacity: value === 'zero' ? 0 : 1 }),
    }),
  },
  {
    breakpoints: { __breakpoints: { md: 768 } },
    containers: { card: { wide: 100 } },
  },
)
const { q } = system

test('boolean guards compile linearly and preserve nested negation', () => {
  const parameters: Record<string, unknown> = {}
  const predicate = q.not(
    q.any(q.all(q.media('md'), q.state('hover')), q.container('card', 'wide')),
  )
  const result = compilePredicateGuard(predicate, 'Root', '0', parameters)
  expect(result).toContain('var(--toned-predicate-')
  expect(JSON.stringify(parameters)).toContain('--media-md-not')
  expect(JSON.stringify(parameters)).toContain('--toned_hover-not')
  expect(JSON.stringify(parameters)).toContain('--cq-card-wide-not')
  expect(Object.keys(parameters).length).toBeLessThan(10)
  for (const media of [false, true])
    for (const hover of [false, true])
      for (const container of [false, true]) {
        const actual = cssTestValue(
          { ...parameters, value: `${result} active` },
          'value',
          {
            '--media-md': media,
            '--media-md-not': !media,
            '--toned_hover': hover,
            '--toned_hover-not': !hover,
            '--cq-card-wide': container,
            '--cq-card-wide-not': !container,
          },
        )
        expect(actual).toBe(
          !((media && hover) || container) ? 'active' : undefined,
        )
      }
})
test('conditional zero values ride guarded property writes and fall back to resting values', () => {
  const style = {
    paint: 'base',
    [CONDITIONAL_RULES]: [
      {
        predicate: q.all(q.media('md'), q.part('Root').state('hover')),
        part: 'Root',
        order: 3,
        style: { paint: 'zero' },
      },
    ],
  }
  const result = system.exec({ tokens: {} }, style as any).style as Record<
    string,
    string
  >
  for (const media of [false, true])
    for (const hover of [false, true])
      expect(
        cssTestValue(result, 'opacity', {
          '--media-md': media,
          '--toned_hover': hover,
        }),
      ).toBe(media && hover ? '0' : '1')
})
test('complement state toggles exist without any viewport configuration', () => {
  expect(generate({})).toContain('._ {--toned_hover-not: ;}')
  expect(generate({})).toContain('._:hover {--toned_hover-not: initial;}')
})
test('namespace leaves caller scope and literal strings and URLs intact', () => {
  const result = namespaceCss(
    '.external .paint_base{content:"--literal .name";background:url(/asset.name--value.png);color:var(--paint)}',
    'one',
    { scope: '.external' },
  )
  expect(result).toContain('.external .one--paint_base')
  expect(result).toContain('content:"--literal .name"')
  expect(result).toContain('url(/asset.name--value.png)')
  expect(result).toContain('var(--one-paint)')
})

for (const strict of [false, true])
  for (const useClassName of [false, true])
    test(`advanced guards respect override field order (${strict ? 'descriptor' : 'legacy'}, classes=${useClassName})`, () => {
      const tokens = {
        paint: defineToken({
          values: [0, 0.5, 1],
          resolve: (value: number) => ({ opacity: value }),
        }),
        width: defineToken({
          values: [1, 2],
          resolve: (value: number) => ({ width: value }),
        }),
      }
      const ref = strict
        ? defineSystem({ id: 'ordered', tokens })
        : defineSystem(tokens)
      const lowerGuard = {
        predicate: ref.q.all(ref.q.part('Root').state('hover')),
        rules: { Root: { paint: 0, width: 2 } },
      }
      const rules = {
        Root: { paint: 1, width: 1 },
        [WHEN_RULES]: [lowerGuard],
        [RULE_LAYERS]: [{ Root: { paint: 0.5 } }],
      }
      const matcher = new StyleMatcher(rules, { cssPseudoMode: true })
      const output = ref.exec(
        { tokens: {}, useClassName },
        matcher.match({}).Root,
      )
      const css = output.style as Record<string, unknown>
      const prefix = strict ? '--ordered-' : '--'
      if (useClassName) {
        expect(
          output.className
            ?.split(' ')
            .filter((name) => name.includes('paint_')),
        ).toEqual([strict ? 'ordered--paint_0.5' : 'paint_0.5'])
        expect(
          generate(ref.system, strict ? { id: ref.id } : undefined),
        ).toContain('paint_0\\.5{opacity:0.5;}')
      } else expect(css['opacity']).toBe(0.5)
      for (const hover of [false, true])
        expect(
          cssTestValue(css, 'width', { [`${prefix}toned_hover`]: hover }),
        ).toBe(hover ? '2px' : '1px')
      const runtime = new StyleMatcher(rules)
      const active = ref.exec(
        { tokens: {}, useClassName: false },
        runtime.match({ 'Root:hover': true }).Root,
      ).style
      expect(active).toMatchObject({ opacity: 0.5, width: 2 })

      const higherGuard = {
        predicate: ref.q.all(ref.q.part('Root').state('focus')),
        rules: { Root: { paint: 1 } },
      }
      const final = new StyleMatcher(
        {
          ...rules,
          [RULE_LAYERS]: [
            { Root: { paint: 0.5 }, [WHEN_RULES]: [higherGuard] },
          ],
        },
        { cssPseudoMode: true },
      )
      const finalCss = ref.exec(
        { tokens: {}, useClassName },
        final.match({}).Root,
      ).style as Record<string, unknown>
      for (const hover of [false, true])
        for (const focus of [false, true]) {
          const toggles = {
            [`${prefix}toned_hover`]: hover,
            [`${prefix}toned_focus`]: focus,
          }
          expect(cssTestValue(finalCss, 'opacity', toggles)).toBe(
            focus ? '1' : '0.5',
          )
          expect(cssTestValue(finalCss, 'width', toggles)).toBe(
            hover ? '2px' : '1px',
          )
        }
    })
