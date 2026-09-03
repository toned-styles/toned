import { describe, expect, test } from 'vitest'
import {
  CSS_ONLY_PSEUDO_STATES,
  PSEUDO_CASCADE_ORDER,
  PSEUDO_SIGNATURE_SEPARATOR,
  PSEUDO_STATES,
} from './pseudo.ts'

describe('pseudo constants', () => {
  test('cascade order is a permutation of tracked + css-only states (single source)', () => {
    expect([...PSEUDO_CASCADE_ORDER].sort()).toEqual(
      [...PSEUDO_STATES, ...CSS_ONLY_PSEUDO_STATES].sort(),
    )
  })

  test('cascade order runs :hover < :focus < :focus-visible < :active (active outermost)', () => {
    expect(PSEUDO_CASCADE_ORDER).toEqual([':hover', ':focus', ':focus-visible', ':active'])
  })

  test('signature separator disambiguates prefix pseudos', () => {
    const sign = (pseudos: string[]) => pseudos.join(PSEUDO_SIGNATURE_SEPARATOR)

    // A naive concatenation ('' join) collides once a pseudo name is a prefix of
    // another; the separator keeps every distinct set distinct.
    expect(sign([':focus'])).not.toBe(sign([':focus-visible']))
    expect(sign([':hover', ':active'])).not.toBe(sign([':hoveractive']))
    // The separator is a single control character, never part of a pseudo name.
    expect(PSEUDO_SIGNATURE_SEPARATOR).toHaveLength(1)
    expect(':hover'.includes(PSEUDO_SIGNATURE_SEPARATOR)).toBe(false)
  })
})
