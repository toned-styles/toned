import { describe, expect, test } from 'vitest'

import { defineSystem, defineToken } from './definers.ts'
import { needsHover, statesWith } from './states.ts'

const gap = defineToken({ values: [1], resolve: (gap) => ({ gap }) })

describe('declared states', () => {
  test('a relation is checked when the system is defined, on both definition forms', () => {
    const states = {
      open: { selector: '[data-open]', relations: ['parent'] },
    } as never
    expect(() =>
      defineSystem({ id: 'states', tokens: { gap }, conditions: { states } }),
    ).toThrow(/relation "parent"/)
    expect(() => defineSystem({ gap }, { states })).toThrow(/relation "parent"/)
  })

  test('only the states that declare a relation offer it', () => {
    expect(
      statesWith(
        {
          open: { selector: '[data-open]', relations: ['ancestor'] },
          active: { selector: '[data-active]', relations: ['sibling'] },
          checked: '[data-checked]',
        },
        'ancestor',
      ),
    ).toEqual(['open'])
  })

  test('a selector needs hover only through the :hover pseudo-class', () => {
    expect(needsHover(':is([data-row]:hover)')).toBe(true)
    expect(needsHover(':hover')).toBe(true)
    expect(needsHover('[data-hovered]')).toBe(false)
    expect(needsHover(':hover-ish')).toBe(false)
  })
})
