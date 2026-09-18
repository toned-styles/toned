import { expect, test } from 'vitest'
import { compileRules, foldOperations, resolvePlan } from '../../core/plan.ts'
import { defineSystem, defineToken } from '../../system/definers.ts'
import {
  RULE_LAYERS,
  type RuleObject,
  TOKEN_OPERATIONS,
} from '../rule-protocol.ts'
import { StyleMatcher } from '../StyleMatcher.ts'

for (const sourceOrder of [false, true]) {
  test(`matcher and portable compilation retain occurrence order and removals (sourceOrder=${sourceOrder})`, () => {
    const offset = defineToken({
      values: Array.from({ length: 41 }, (_, value) => value),
      resolve: (value: number) => ({ marginLeft: value }),
    })
    const system = sourceOrder
      ? defineSystem({ id: 'normalization-differential', tokens: { offset } })
      : defineSystem({ offset })
    const rules: RuleObject = {
      Root: { style: { opacity: 1, marginLeft: -1 }, offset: 0 },
    }
    for (let index = 0; index < 40; index++) {
      // Two different tokens write the same field, in alternating orders.
      const style = { marginLeft: index + 100 }
      rules[`[flag${index % 6}=true][step${index}=true]`] = {
        Root:
          index % 2
            ? { offset: index + 1, style }
            : { style, offset: index + 1 },
      }
    }
    const layers = [
      { Root: { style: { opacity: null, paddingTop: 3 } } },
      { '[finish=true]': { Root: { style: { marginLeft: 999 } } } },
    ]
    Object.defineProperty(rules, RULE_LAYERS, { value: layers })
    const authored = JSON.stringify({ rules, layers })
    const matcher = new StyleMatcher(rules, { sourceOrder })
    const plan = compileRules(system, rules, 'native')
    for (let state = 0; state < 128; state++) {
      const facts: Record<string, boolean> = { finish: !!(state & 64) }
      let marginLeft = 0
      for (let index = 0; index < 40; index++) {
        const flag = !!(state & (1 << (index % 6)))
        const step = (state + index) % 3 !== 0
        facts[`flag${index % 6}`] = flag
        facts[`step${index}`] = step
        if (flag && step) marginLeft = index % 2 ? index + 100 : index + 1
      }
      if (facts['finish']) marginLeft = 999
      const expected = { marginLeft, paddingTop: 3 }
      const actual = foldOperations(
        resolvePlan(plan, system, {}, facts)['Root']!,
      )
      expect(actual.style).toEqual(expected)
      // Evaluate the matcher's complete occurrence stream independently of the
      // portable resolver; a merged token dictionary loses alternating writes.
      const matched: Record<string, unknown> = {}
      for (const operation of matcher.match(facts).Root[TOKEN_OPERATIONS]) {
        Object.assign(
          matched,
          operation.key === 'offset'
            ? { marginLeft: operation.value }
            : operation.value,
        )
      }
      expect(matched).toEqual(expected)
    }
    expect(JSON.stringify({ rules, layers })).toBe(authored)
    expect(
      plan.operations.some((operation) => operation.origin.layer === 2),
    ).toBe(true)
    expect(Object.isFrozen(plan.operations)).toBe(true)
  })
}
