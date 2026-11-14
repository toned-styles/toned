import { describe, expect, test } from 'vitest'

import { buildStyles } from '../build/index.ts'
import { createWebRenderer } from '../server/index.ts'
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

  test('a channel key a part writes itself needs the relation too, and names it', () => {
    const system = defineSystem({
      id: 'channels',
      tokens: { gap },
      conditions: {
        states: {
          disabled: ':disabled',
          open: { selector: '[data-open]', relations: ['ancestor'] },
        },
      },
    })
    const resolve = (rules: object) => {
      const sheet = (system.stylesheet as (rules: object) => never)(rules)
      const { manifest } = buildStyles(system, { sheets: [sheet] })
      return createWebRenderer(system, { manifest }).resolve(sheet)
    }
    expect(() =>
      resolve({ Root: { gap: 1 }, Label: { ':sib-disabled': { gap: 1 } } }),
    ).toThrow(
      `Toned: ':sib-disabled' reads state "disabled" through its sibling channel, which the system does not declare. Declare it: states: { 'disabled': { selector: ":disabled", relations: ['sibling'] } }`,
    )
    expect(() =>
      resolve({ Root: { gap: 1 }, Label: { ':sib-open': { gap: 1 } } }),
    ).toThrow(/relations: \['ancestor', 'sibling'\]/)
    // Declared relations, and the built-in hover channel, still resolve.
    expect(() =>
      resolve({
        Root: { gap: 1 },
        Label: { ':src-open': { gap: 1 }, ':sib-hover': { gap: 1 } },
      }),
    ).not.toThrow()
  })
})
