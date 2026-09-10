import { describe, expect, test } from 'vitest'
import { flattenSelectorBlocks } from './selectorBlocks.ts'

describe('flattenSelectorBlocks', () => {
  test('flattens a breakpoint block into underscore-joined keys', () => {
    const result = flattenSelectorBlocks({
      padding: 'small',
      '@md': { padding: 'large' },
    })

    expect(result).toEqual({ padding: 'small', '@md_padding': 'large' })
  })

  test('flattens a pseudo block into underscore-joined keys', () => {
    const result = flattenSelectorBlocks({
      bgColor: 'base',
      ':hover': { bgColor: 'accent' },
    })

    expect(result).toEqual({ bgColor: 'base', ':hover_bgColor': 'accent' })
  })

  test('flattens every property of a multi-property block', () => {
    const result = flattenSelectorBlocks({
      '@lg': { padding: 'large', gap: 'small' },
    })

    expect(result).toEqual({
      '@lg_padding': 'large',
      '@lg_gap': 'small',
    })
  })

  test('flattens breakpoint and pseudo blocks together', () => {
    const result = flattenSelectorBlocks({
      padding: 'small',
      '@md': { padding: 'large' },
      ':hover': { bgColor: 'accent' },
    })

    expect(result).toEqual({
      padding: 'small',
      '@md_padding': 'large',
      ':hover_bgColor': 'accent',
    })
  })

  test('returns the same reference when there is nothing to flatten', () => {
    const input = { padding: 'small', bgColor: 'base' }

    expect(flattenSelectorBlocks(input)).toBe(input)
  })

  test('does not mutate the input', () => {
    const input = { padding: 'small', '@md': { padding: 'large' } }
    flattenSelectorBlocks(input)

    expect(input).toEqual({ padding: 'small', '@md': { padding: 'large' } })
  })

  test('leaves an already-flattened key alone, since its value is not a block', () => {
    const input = { padding: 'small', '@md_padding': 'large' }

    expect(flattenSelectorBlocks(input)).toBe(input)
  })

  test('flattens a selector key containing an underscore', () => {
    // The joiner is appended, never searched for, so multi-word breakpoint
    // names survive this step intact.
    const result = flattenSelectorBlocks({
      '@small_screen': { padding: 'large' },
    })

    expect(result).toEqual({ '@small_screen_padding': 'large' })
  })

  test('ignores non-selector keys whose value is an object', () => {
    const input = { style: { opacity: 0.5 }, padding: 'small' }

    expect(flattenSelectorBlocks(input)).toBe(input)
  })

  test('ignores selector keys whose value is not a block', () => {
    const input = { '@md': 'not-a-block', ':hover': null }

    expect(flattenSelectorBlocks(input)).toBe(input)
  })

  test('ignores selector keys holding an array', () => {
    const input = { '@md': ['a', 'b'] }

    expect(flattenSelectorBlocks(input)).toBe(input)
  })

  test('preserves symbol-keyed properties', () => {
    const marker = Symbol('marker')
    const input = { '@md': { padding: 'large' }, [marker]: 'kept' }

    const result = flattenSelectorBlocks(input)

    expect(result[marker]).toBe('kept')
    expect(result).toHaveProperty('@md_padding', 'large')
  })

  test('flattens an empty block to nothing', () => {
    const result = flattenSelectorBlocks({ padding: 'small', '@md': {} })

    expect(result).toEqual({ padding: 'small' })
  })
})
