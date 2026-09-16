import { describe, expect, test } from 'vitest'
import { StyleMatcher } from '../StyleMatcher.ts'
import { createVariantSelector } from '../variantSelector.ts'

describe('variant selector identity', () => {
  test('four-axis chain order agrees with the canonical literal type', () => {
    const $ = createVariantSelector<{
      size: 's'
      variant: 'accent'
      active: true
      order: 0
    }>()
    const first: '[active=true][order=0][size=s][variant=accent]' = $.size('s')
      .variant('accent')
      .active(true)
      .order(0)
    const second: typeof first = $.order(0)
      .active(true)
      .variant('accent')
      .size('s')
    expect(String(first)).toBe('[active=true][order=0][size=s][variant=accent]')
    expect(String(second)).toBe(String(first))
  })

  test('OR values are sorted, deduplicated and all accepted by the matcher', () => {
    const $ = createVariantSelector<{ size: 's' | 'm' | 'l' }>()
    const selector: '[size=m][size=s]' = $.size('s', 'm', 's')
    expect(String(selector)).toBe('[size=m][size=s]')
    const matcher = new StyleMatcher({ [selector]: { Root: { value: 1 } } })
    expect(matcher.match({ size: 's' }).Root.value).toBe(1)
    expect(matcher.match({ size: 'm' }).Root.value).toBe(1)
    expect(matcher.match({ size: 'l' }).Root).toEqual({})
  })

  test('escaped delimiters cannot inject extra selector constraints', () => {
    const $ = createVariantSelector<{ value: 'a=b|[c]%' | '*' }>()
    const key: '[value=a%3Db%7C%5Bc%5D%25]' = $.value('a=b|[c]%')
    expect(String(key)).toBe('[value=a%3Db%7C%5Bc%5D%25]')
    const matcher = new StyleMatcher({
      [key]: { Root: { value: 1 } },
      [$.value('*')]: { Root: { literalStar: true } },
    })
    expect(matcher.match({ value: 'a=b|[c]%' }).Root).toEqual({ value: 1 })
    expect(matcher.match({ value: '*' }).Root).toEqual({ literalStar: true })
    expect(matcher.match({}).Root).toEqual({})
  })

  test('factory duplicate detection happens before object keys are lost', () => {
    const $ = createVariantSelector<{ size: 's'; active: true }>([], {
      rejectDuplicates: true,
    })
    expect(() => ({
      [$.size('s').active(true)]: { first: true },
      [$.active(true).size('s')]: { second: true },
    })).toThrow('Duplicate Toned variant selector')
  })
})
