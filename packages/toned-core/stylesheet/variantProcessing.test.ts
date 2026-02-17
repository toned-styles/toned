import { describe, expect, test } from 'vitest'

import {
  deepMerge,
  extractOrderedKeys,
  mergeRules,
  processVariantRules,
} from './variantProcessing.ts'

describe('deepMerge', () => {
  test('returns target if source is null', () => {
    const target = { a: 1, b: 2 }
    expect(deepMerge(target, null)).toBe(target)
  })

  test('returns target if source is undefined', () => {
    const target = { a: 1 }
    expect(deepMerge(target, undefined)).toBe(target)
  })

  test('returns source if target is null', () => {
    const source = { a: 1 }
    expect(deepMerge(null, source)).toBe(source)
  })

  test('returns source if target is undefined', () => {
    const source = { a: 1 }
    expect(deepMerge(undefined, source)).toBe(source)
  })

  test('shallow merge of flat objects', () => {
    const target = { a: 1, b: 2 }
    const source = { c: 3, d: 4 }

    expect(deepMerge(target, source)).toEqual({ a: 1, b: 2, c: 3, d: 4 })
  })

  test('deep merge of nested objects', () => {
    const target = { a: { x: 1, y: 2 }, b: 10 }
    const source = { a: { y: 3, z: 4 } }

    expect(deepMerge(target, source)).toEqual({
      a: { x: 1, y: 3, z: 4 },
      b: 10,
    })
  })

  test('source overrides target for primitive values', () => {
    const target = { a: 1, b: 'hello' }
    const source = { a: 99, b: 'world' }

    expect(deepMerge(target, source)).toEqual({ a: 99, b: 'world' })
  })

  test('arrays are not merged — source replaces target', () => {
    const target = { items: [1, 2, 3] }
    const source = { items: [4, 5] }

    expect(deepMerge(target, source)).toEqual({ items: [4, 5] })
  })

  test('handles empty objects', () => {
    expect(deepMerge({}, {})).toEqual({})
    expect(deepMerge({ a: 1 }, {})).toEqual({ a: 1 })
    expect(deepMerge({}, { b: 2 })).toEqual({ b: 2 })
  })

  test('does not mutate target or source', () => {
    const target = { a: { x: 1 } }
    const source = { a: { y: 2 } }

    const result = deepMerge(target, source)

    expect(target).toEqual({ a: { x: 1 } })
    expect(source).toEqual({ a: { y: 2 } })
    expect(result).toEqual({ a: { x: 1, y: 2 } })
  })

  test('deeply nested merge across multiple levels', () => {
    const target = { a: { b: { c: 1, d: 2 } } }
    const source = { a: { b: { d: 99, e: 3 } } }

    expect(deepMerge(target, source)).toEqual({
      a: { b: { c: 1, d: 99, e: 3 } },
    })
  })
})

describe('extractOrderedKeys', () => {
  test('extracts single key from selector like [size=sm]', () => {
    const variantRules = {
      '[size=sm]': { container: { paddingX: 2 } },
    }

    expect(extractOrderedKeys(variantRules)).toEqual(['size'])
  })

  test('extracts multiple keys from combined selector [size=sm][variant=accent]', () => {
    const variantRules = {
      '[size=sm][variant=accent]': { container: { paddingX: 2 } },
    }

    expect(extractOrderedKeys(variantRules)).toEqual(['size', 'variant'])
  })

  test('extracts keys from multiple selectors', () => {
    const variantRules = {
      '[size=sm]': { container: { paddingX: 2 } },
      '[variant=accent]': { container: { bgColor: 'yellow' } },
    }

    expect(extractOrderedKeys(variantRules)).toEqual(['size', 'variant'])
  })

  test('skips $named$_ prefixed selectors', () => {
    const variantRules = {
      $named$_reusable: { container: { bgColor: 'red' } },
      '[size=sm]': { container: { paddingX: 2 } },
    }

    expect(extractOrderedKeys(variantRules)).toEqual(['size'])
  })

  test('skips $NONE$ values', () => {
    const variantRules = {
      '[$NONE$=something]': { container: { paddingX: 2 } },
      '[size=sm]': { container: { paddingX: 4 } },
    }

    expect(extractOrderedKeys(variantRules)).toEqual(['size'])
  })

  test('returns unique keys when same key appears in multiple selectors', () => {
    const variantRules = {
      '[size=sm]': { container: { paddingX: 2 } },
      '[size=md]': { container: { paddingX: 4 } },
      '[size=lg]': { container: { paddingX: 6 } },
    }

    expect(extractOrderedKeys(variantRules)).toEqual(['size'])
  })

  test('returns empty array for empty input', () => {
    expect(extractOrderedKeys({})).toEqual([])
  })

  test('returns empty array when only named styles present', () => {
    const variantRules = {
      $named$_base: { container: { bgColor: 'blue' } },
      $named$_accent: { container: { bgColor: 'yellow' } },
    }

    expect(extractOrderedKeys(variantRules)).toEqual([])
  })

  test('handles wildcard values in selectors', () => {
    const variantRules = {
      '[size=sm][variant=*]': { container: { paddingX: 2 } },
    }

    expect(extractOrderedKeys(variantRules)).toEqual(['size', 'variant'])
  })
})

describe('processVariantRules', () => {
  test('passes through simple variant rules unchanged', () => {
    const variantRules = {
      '[size=sm]': {
        container: { paddingX: 2 },
        label: { fontSize: 12 },
      },
    }

    const result = processVariantRules(variantRules, new Set())

    expect(result).toEqual({
      '[size=sm]': {
        container: { paddingX: 2 },
        label: { fontSize: 12 },
      },
    })
  })

  test('resolves $compose at variant level', () => {
    const variantRules = {
      $named$_shared: {
        container: { borderWidth: 1, borderColor: 'gray' },
      },
      '[size=sm]': {
        $compose: 'shared',
        container: { paddingX: 2 },
      },
    }

    const result = processVariantRules(variantRules, new Set())

    expect(result['[size=sm]'].container).toEqual({
      borderWidth: 1,
      borderColor: 'gray',
      paddingX: 2,
    })
  })

  test('resolves $compose at element level', () => {
    const variantRules = {
      '[size=sm]': {
        base: { paddingX: 2, bgColor: 'blue' },
        container: {
          $compose: 'base',
          borderRadius: 4,
        },
      },
    }

    const result = processVariantRules(variantRules, new Set())

    // Element-level $compose looks up sibling elements in the same rule
    expect(result['[size=sm]'].container).toEqual({
      paddingX: 2,
      bgColor: 'blue',
      borderRadius: 4,
    })
  })

  test('skips named style keys in output', () => {
    const variantRules = {
      $named$_shared: {
        container: { borderWidth: 1 },
      },
      '[size=sm]': {
        $compose: 'shared',
        container: { paddingX: 2 },
      },
    }

    const result = processVariantRules(variantRules, new Set())

    expect(result).not.toHaveProperty('$named$_shared')
    expect(result).toHaveProperty('[size=sm]')
  })

  test('handles multiple $compose targets as array', () => {
    const variantRules = {
      $named$_borders: {
        container: { borderWidth: 1, borderColor: 'gray' },
      },
      $named$_spacing: {
        container: { margin: 4 },
        label: { paddingX: 2 },
      },
      '[size=sm]': {
        $compose: ['borders', 'spacing'],
        container: { bgColor: 'blue' },
      },
    }

    const result = processVariantRules(variantRules, new Set())

    expect(result['[size=sm]'].container).toEqual({
      borderWidth: 1,
      borderColor: 'gray',
      margin: 4,
      bgColor: 'blue',
    })
    expect(result['[size=sm]'].label).toEqual({
      paddingX: 2,
    })
  })

  test('variant-level $compose merges before own element rules', () => {
    const variantRules = {
      $named$_shared: {
        container: { bgColor: 'gray', paddingX: 2 },
      },
      '[size=sm]': {
        $compose: 'shared',
        container: { bgColor: 'blue' },
      },
    }

    const result = processVariantRules(variantRules, new Set())

    // The own element rule should override the composed value
    expect(result['[size=sm]'].container).toEqual({
      paddingX: 2,
      bgColor: 'blue',
    })
  })

  test('element-level $compose merges sibling element styles', () => {
    const variantRules = {
      '[variant=accent]': {
        icon: { color: 'yellow', size: 16 },
        label: {
          $compose: 'icon',
          fontSize: 14,
        },
      },
    }

    const result = processVariantRules(variantRules, new Set())

    expect(result['[variant=accent]'].label).toEqual({
      color: 'yellow',
      size: 16,
      fontSize: 14,
    })
  })

  test('element-level $compose strips $compose from source element', () => {
    const variantRules = {
      '[variant=accent]': {
        source: { $compose: 'other', color: 'red' },
        target: {
          $compose: 'source',
          fontSize: 14,
        },
      },
    }

    const result = processVariantRules(variantRules, new Set())

    // $compose should be stripped from the source when merging into target
    expect(result['[variant=accent]'].target).toEqual({
      color: 'red',
      fontSize: 14,
    })
    expect(result['[variant=accent]'].target).not.toHaveProperty('$compose')
  })

  test('handles multiple variant selectors independently', () => {
    const variantRules = {
      '[size=sm]': { container: { paddingX: 2 } },
      '[size=md]': { container: { paddingX: 4 } },
      '[variant=accent]': { container: { bgColor: 'yellow' } },
    }

    const result = processVariantRules(variantRules, new Set())

    expect(result['[size=sm]']).toEqual({ container: { paddingX: 2 } })
    expect(result['[size=md]']).toEqual({ container: { paddingX: 4 } })
    expect(result['[variant=accent]']).toEqual({
      container: { bgColor: 'yellow' },
    })
  })

  test('element-level $compose with array of targets', () => {
    const variantRules = {
      '[size=sm]': {
        header: { fontWeight: 'bold' },
        body: { lineHeight: 1.5 },
        footer: {
          $compose: ['header', 'body'],
          textAlign: 'center',
        },
      },
    }

    const result = processVariantRules(variantRules, new Set())

    expect(result['[size=sm]'].footer).toEqual({
      fontWeight: 'bold',
      lineHeight: 1.5,
      textAlign: 'center',
    })
  })
})

describe('mergeRules', () => {
  test('returns baseRules when variantRules is undefined', () => {
    const baseRules = {
      container: { bgColor: 'blue' },
      label: { textColor: 'white' },
    }

    expect(mergeRules(baseRules, undefined)).toBe(baseRules)
  })

  test('returns baseRules when variantRules is null-ish', () => {
    const baseRules = { container: { bgColor: 'blue' } }

    expect(mergeRules(baseRules, null)).toBe(baseRules)
    expect(mergeRules(baseRules, '')).toBe(baseRules)
    expect(mergeRules(baseRules, 0)).toBe(baseRules)
  })

  test('merges base and variant rules', () => {
    const baseRules = {
      container: { bgColor: 'blue' },
    }
    const variantRules = {
      '[size=sm]': { container: { paddingX: 2 } },
    }

    expect(mergeRules(baseRules, variantRules)).toEqual({
      container: { bgColor: 'blue' },
      '[size=sm]': { container: { paddingX: 2 } },
    })
  })

  test('variant rules override base rules with same key', () => {
    const baseRules = {
      container: { bgColor: 'blue' },
      shared: { padding: 2 },
    }
    const variantRules = {
      shared: { padding: 4, margin: 1 },
      '[size=sm]': { container: { paddingX: 2 } },
    }

    const result = mergeRules(baseRules, variantRules)

    // Variant's "shared" overrides base's "shared" (shallow spread)
    expect(result.shared).toEqual({ padding: 4, margin: 1 })
    expect(result.container).toEqual({ bgColor: 'blue' })
    expect(result['[size=sm]']).toEqual({ container: { paddingX: 2 } })
  })

  test('does not mutate the original objects', () => {
    const baseRules = { container: { bgColor: 'blue' } }
    const variantRules = { label: { textColor: 'white' } }

    const result = mergeRules(baseRules, variantRules)

    expect(result).not.toBe(baseRules)
    expect(result).not.toBe(variantRules)
    expect(baseRules).toEqual({ container: { bgColor: 'blue' } })
    expect(variantRules).toEqual({ label: { textColor: 'white' } })
  })
})
