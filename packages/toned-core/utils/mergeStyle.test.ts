import { describe, expect, test } from 'vitest'
import { mergeStyle } from './mergeStyle.ts'

describe('mergeStyle', () => {
  test('merges two style objects one level deep, source overriding target', () => {
    expect(mergeStyle({ color: 'red', opacity: 1 }, { color: 'blue' })).toEqual(
      { color: 'blue', opacity: 1 },
    )
  })

  test('returns the source when the target is nullish (no existing style to keep)', () => {
    expect(mergeStyle(undefined, { color: 'blue' })).toEqual({ color: 'blue' })
    expect(mergeStyle(null, { color: 'blue' })).toEqual({ color: 'blue' })
  })

  test('returns the target when the source is nullish (a missing style never wipes one)', () => {
    expect(mergeStyle({ color: 'red' }, undefined)).toEqual({ color: 'red' })
    expect(mergeStyle({ color: 'red' }, null)).toEqual({ color: 'red' })
  })

  test('returns undefined when both operands are nullish', () => {
    expect(mergeStyle(undefined, undefined)).toBeUndefined()
  })

  test('source wins when either operand is not a plain object', () => {
    expect(mergeStyle('inherit', { color: 'blue' })).toEqual({ color: 'blue' })
    expect(mergeStyle({ color: 'red' }, 'inherit')).toBe('inherit')
  })

  test('does not mutate its operands', () => {
    const target = { color: 'red' }
    const source = { color: 'blue' }
    mergeStyle(target, source)
    expect(target).toEqual({ color: 'red' })
    expect(source).toEqual({ color: 'blue' })
  })
})
