import { expect, test } from 'vitest'
import { getConfig } from '../system/config.ts'
import { defineSystem, defineToken } from '../system/definers.ts'
import { immutableSnapshot } from '../utils/immutable.ts'
import { controllerPlan } from './controller-plan.ts'
import { StyleMatcher } from './StyleMatcher.ts'
import { Base } from './StyleSheet.ts'

test('speculative candidates share only immutable resolution results for the same output context', () => {
  let resolutions = 0
  const system = defineSystem({
    ink: defineToken({
      values: ['rest', 'active'],
      resolve: (value, tokens) => {
        resolutions++
        return { color: value === 'rest' ? tokens['ink'] : 'blue' }
      },
    }),
  })
  const rules = {
    Root: { ink: 'rest' },
    '[active=true]': { Root: { ink: 'active' } },
  }
  const tokens = immutableSnapshot({ ink: 'red' })
  const config = {
    ...getConfig(),
    platform: 'native' as const,
    getTokens: () => tokens,
    useClassName: false,
    mediaMode: false as const,
  }
  const current = new Base({ ref: system, rules, config })
  const initial = current.getCurrentStyle('Root')
  const resolved = resolutions
  const unchanged = new Base({ ref: system, rules, config })
  unchanged.prepare(current)
  expect(unchanged.getCurrentStyle('Root')).toBe(initial)
  expect(resolutions).toBe(resolved)
  const speculative = new Base({
    ref: system,
    rules,
    config,
    modsState: { active: true },
  })
  speculative.prepare(current)
  expect(speculative.getCurrentStyle('Root').style.color).toBe('blue')
  expect(current.getCurrentStyle('Root')).toBe(initial)
  expect(current.modsState['active']).toBeUndefined()
  expect(Object.isFrozen(initial.style)).toBe(true)
  const themed = new Base({
    ref: system,
    rules,
    config: { ...config, getTokens: () => ({ ink: 'green' }) },
  })
  themed.prepare(current)
  expect(themed.getCurrentStyle('Root').style.color).toBe('green')
  const converted = new Base({
    ref: system,
    rules,
    config: {
      ...config,
      backend: {
        id: 'converted',
        platform: 'native',
        browserConditions: false,
        resolve: (value) => ({ style: { ...value.style, opacity: 0.25 } }),
      },
    },
  })
  converted.prepare(current)
  expect(converted.getCurrentStyle('Root').style.opacity).toBe(0.25)
})

test('dependency index expands composite facts and tracks each affected part', () => {
  const matcher = new StyleMatcher({
    Root: { style: { opacity: 1 }, ':hover': { style: { opacity: 0.5 } } },
    Label: { '@card/wide&large': { style: { width: 200 } } },
    Footer: { '@sidebar/wide': { style: { width: 100 } } },
    '[active=true]': { Label: { style: { height: 20 } } },
  })
  expect([...matcher.partsForFacts(['@large'])]).toEqual(['Label'])
  expect([...matcher.partsForFacts(['@sidebar/wide'])]).toEqual(['Footer'])
  expect([...matcher.partsForFacts(['Root:hover'])]).toEqual(['Root'])
  expect([...matcher.partsForFacts(['active'])]).toEqual(['Label'])
  expect([...matcher.partsForFacts(['unused'])]).toEqual([])
  const plan = controllerPlan(matcher)
  expect(plan.containerNames).toEqual(['card', 'sidebar'])
  expect(plan.partContainers['Label']).toEqual(['card'])
  expect(plan.partContainers['Footer']).toEqual(['sidebar'])
  expect(plan.partContainers['Root']).toBeUndefined()
})

test('legacy mutable token objects and bridge maps are refreshed by new candidates', () => {
  const system = defineSystem({
    ink: defineToken({
      values: [true],
      resolve: (_, tokens) => ({ color: tokens['ink'] }),
    }),
  })
  const rules = { Root: { ink: true } },
    tokens = { ink: 'red' }
  const config = {
    ...getConfig(),
    platform: 'native' as const,
    getTokens: () => tokens,
    useClassName: false,
    mediaMode: false as const,
  }
  const first = new Base({ ref: system, rules, config })
  expect(first.getCurrentStyle('Root').style.color).toBe('red')
  tokens.ink = 'blue'
  const next = new Base({ ref: system, rules, config })
  next.prepare(first)
  expect(next.getCurrentStyle('Root').style.color).toBe('blue')
  const immutable = immutableSnapshot(tokens),
    bridgeProps = { color: 'selectionColor' }
  const bridgeConfig = { ...config, getTokens: () => immutable, bridgeProps }
  const before = new Base({ ref: system, rules, config: bridgeConfig })
  expect(before.getCurrentStyle('Root').selectionColor).toBe('blue')
  bridgeProps.color = 'placeholderTextColor'
  const after = new Base({ ref: system, rules, config: bridgeConfig })
  after.prepare(before)
  expect(after.getCurrentStyle('Root').placeholderTextColor).toBe('blue')
  expect(after.getCurrentStyle('Root').selectionColor).toBeUndefined()
})
