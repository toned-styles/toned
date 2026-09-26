import { expect, it, vi } from 'vitest'
import { compileRules } from '../../core/plan.ts'
import { defineSystem, defineToken } from '../../system/definers.ts'
import * as normalizer from './normalizeRules.ts'
import { sharedMatcher } from './sharedMatcher.ts'
import { StyleMatcher } from '../StyleMatcher.ts'
import { sharedRuntimeNormalization } from './sharedNormalization.ts'

it('shares only the requested cascade mode and preserves standalone matcher input updates', () => {
  const rules = {
    Root: { padding: 1 },
    '[size=s]': { Root: { ':hover': { padding: 2 } }, Label: { padding: 3 } },
    '[variant=accent]': { Root: { padding: 4 } },
  }
  const explicit = sharedRuntimeNormalization(rules, true)
  expect(sharedRuntimeNormalization(rules, true)).toBe(explicit)
  expect(sharedRuntimeNormalization(rules, false)).not.toBe(explicit)
  const shared = new StyleMatcher(rules, { sourceOrder: true }, explicit)
  const ordinary = new StyleMatcher(rules, { sourceOrder: true })
  for (const size of ['s', 'm'])
    for (const variant of ['accent', 'quiet'])
      for (const hovered of [true, false]) {
        const facts = { size, variant, 'Root:hover': hovered }
        expect(shared.match(facts)).toEqual(ordinary.match(facts))
      }
  rules.Root.padding = 9
  expect(new StyleMatcher(rules).match({}).Root.padding).toBe(9)
  expect(shared.match({}).Root.padding).toBe(1)
})

it('normalizes once when the matcher and portable compiler request the same runtime rules', () => {
  const ui = defineSystem({
    size: defineToken({
      values: [1, 2],
      resolve: (value) => ({ padding: value }),
    }),
  })
  const normalize = vi.spyOn(normalizer, 'normalizeRules')
  try {
    for (const planFirst of [false, true]) {
      const rules = {
        Root: { size: 1 },
        '[selected=true]': { Root: { size: 2 } },
      }
      normalize.mockClear()
      if (planFirst) compileRules(ui, rules, 'native')
      const matcher = sharedMatcher(
        rules,
        false,
        false,
        undefined,
        'native',
        false,
      )
      compileRules(ui, rules, 'native')
      expect(matcher.match({ selected: true }).Root.size).toBe(2)
      expect(sharedRuntimeNormalization(rules, false, 'web')).toBe(
        sharedRuntimeNormalization(rules, false, 'native'),
      )
      expect(normalize).toHaveBeenCalledTimes(1)
    }
  } finally {
    normalize.mockRestore()
  }
})

it('keeps platform-specialized metadata isolated while standalone unspecified matchers remain conservative', () => {
  const ui = defineSystem({})
  const query = ui.q.all(
    ui.q.platform('web'),
    ui.q.part('Root').has('Label', 'hover'),
  )
  const rules = {
    Root: {},
    Label: {},
    [query]: { Root: { style: { opacity: 0.5 } } },
  }
  const native = sharedMatcher(rules, false, false, undefined, 'native')
  const web = sharedMatcher(rules, false, false, undefined, 'web')
  expect(native.interactions).toEqual({})
  expect(web.interactions['Label']).toEqual({ ':hover': true })
  expect(new StyleMatcher(rules).interactions['Label']).toEqual({
    ':hover': true,
  })
  expect(sharedRuntimeNormalization(rules, false, 'native')).not.toBe(
    sharedRuntimeNormalization(rules, false, 'web'),
  )
})
