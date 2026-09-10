import { describe, expect, test } from 'vitest'
import { mergeStyle, toStyleMap } from './mergeStyle.ts'

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

describe('toStyleMap', () => {
  test('passes a plain style object straight through', () => {
    const input = { top: 1 }

    expect(toStyleMap(input)).toBe(input)
  })

  test('collapses a React Native style array, later entries winning', () => {
    expect(toStyleMap([{ top: 1, left: 0 }, { left: 2 }])).toEqual({
      top: 1,
      left: 2,
    })
  })

  test('skips the falsy entries a conditional array produces', () => {
    // style={[base, isActive && active]} is idiomatic React Native.
    expect(toStyleMap([{ top: 1 }, false, null, undefined])).toEqual({ top: 1 })
  })

  test('flattens nested arrays', () => {
    expect(toStyleMap([[{ top: 1 }], [[{ left: 2 }]]])).toEqual({
      top: 1,
      left: 2,
    })
  })

  test('returns undefined for a value that cannot be a style map', () => {
    expect(toStyleMap('nope')).toBeUndefined()
    expect(toStyleMap(null)).toBeUndefined()
    expect(toStyleMap(undefined)).toBeUndefined()
  })
})

describe('mergeStyle with arrays', () => {
  test('merges two style arrays into one map', () => {
    expect(mergeStyle([{ top: 1 }], [{ left: 2 }])).toEqual({
      top: 1,
      left: 2,
    })
  })

  test('merges an array into an object', () => {
    expect(mergeStyle({ top: 1 }, [{ left: 2 }])).toEqual({ top: 1, left: 2 })
  })

  test('never spreads an array by index', () => {
    // The old behaviour produced { "0": { left: 2 } }.
    expect(mergeStyle([{ top: 1 }], [{ left: 2 }])).not.toHaveProperty('0')
  })
})
