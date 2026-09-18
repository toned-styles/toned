import { expect, test } from 'vitest'
import { getConfig } from '../system/config.ts'
import { defineSystem } from '../system/definers.ts'
import {
  controllerPlan,
  evaluateControllerConditions,
} from './controller-plan.ts'
import type { MountedFamily } from './mounted-family.ts'
import { StyleMatcher } from './StyleMatcher.ts'
import { Base } from './StyleSheet.ts'

test('shared controller metadata evaluates independent instance inputs without capturing them', () => {
  const matcher = new StyleMatcher({
    Label: {
      '@card/wide&large': { style: { width: 400 } },
      ':rtl': { style: { opacity: 0.5 } },
    },
  })
  const plan = controllerPlan(matcher)
  expect(controllerPlan(matcher)).toBe(plan)
  expect(Object.isFrozen(plan)).toBe(true)
  expect(Object.isFrozen(plan.keys)).toBe(true)
  expect(Object.isFrozen(plan.conditions)).toBe(true)
  expect(Object.isFrozen(plan.conditions[0])).toBe(true)
  expect(Object.isFrozen(plan.conditions[0]?.expression)).toBe(true)
  expect(Object.isFrozen(plan.conditions[0]?.expression[0])).toBe(true)
  expect(Object.isFrozen(plan.conditions[0]?.expression[0]?.[0])).toBe(true)
  expect(Object.isFrozen(plan.conditions[0]?.atoms)).toBe(true)
  expect(Object.isFrozen(plan.conditions[0]?.atoms[0])).toBe(true)
  expect(
    Object.isFrozen(plan.conditions[0]?.atoms[0]?.expression[0]?.[0]),
  ).toBe(true)
  const first = evaluateControllerConditions(
    plan,
    { containers: { card: { wide: 80 } }, base: 4 },
    { '@large': true },
    { card: 400 },
    'rtl',
  )
  const second = evaluateControllerConditions(
    plan,
    { containers: { card: { wide: 120 } }, base: 4 },
    { '@large': true },
    { card: 400 },
    'ltr',
  )
  expect(first).toMatchObject({
    '@card/wide': true,
    '@card/wide&large': true,
    'Label:rtl': true,
  })
  expect(second).toMatchObject({
    '@card/wide': false,
    '@card/wide&large': false,
    'Label:rtl': false,
  })
  expect(
    evaluateControllerConditions(
      plan,
      { containers: { card: { wide: 80 } }, base: 4 },
      { '@large': false },
      { card: 400 },
    ),
  ).toMatchObject({ '@card/wide': true, '@card/wide&large': false })
})

test('native pseudo metadata keeps custom semantic states and treats direction separately', () => {
  const matcher = new StyleMatcher(
    {
      Item: {
        ':selected': { style: { opacity: 0.5 } },
        ':rtl': { style: { width: 20 } },
      },
    },
    { stateAliases: ['selected'] },
  )
  const plan = controllerPlan(matcher)
  expect(plan.semanticStates).toContain('selected')
  expect(plan.semanticStates).not.toContain('rtl')
  expect(plan.trackedPseudos['Item']).toContain(':selected')
  expect(plan.trackedPseudos['Item']).not.toContain(':rtl')
  expect(plan.trackedPseudos['toString']).toBeUndefined()
  expect(Object.isFrozen(plan.trackedPseudos)).toBe(true)
  expect(Object.isFrozen(plan.trackedPseudos['Item'])).toBe(true)
})

test('pure candidates and disposal allocate no mounted family, inherited candidates retain its owner', () => {
  const system = defineSystem({})
  const rules = { Root: { style: { opacity: 1 } } }
  const config = {
    ...getConfig(),
    getTokens: () => ({}),
    mediaMode: false as const,
    useClassName: false,
  }
  const create = () => new Base({ ref: system, rules, config })
  const pure = create()
  // This allocation assertion protects the candidate/mounted ownership boundary.
  const allocated = (base: Base) =>
    (base as unknown as { _family?: MountedFamily })._family
  pure.getCurrentStyle('Root')
  pure.getRestingStyle('Root')
  pure.applyState({})
  expect(pure.hostValidationRevision).toBe(0)
  pure.dispose()
  expect(allocated(pure)).toBeUndefined()

  const previous = create()
  const stop = previous.subscribeHostValidation(() => {})
  const family = allocated(previous)
  const first = create()
  const second = create()
  first.prepare(previous)
  second.prepare(previous)
  first.getCurrentStyle('Root')
  second.getCurrentStyle('Root')
  expect(allocated(first)).toBe(family)
  expect(allocated(second)).toBe(family)
  expect(family?.current).toBe(previous)
  first.dispose()
  second.dispose()
  expect(family?.current).toBe(previous)
  stop()
})
